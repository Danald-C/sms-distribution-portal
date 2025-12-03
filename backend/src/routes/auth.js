const express = require('express');
const { hybridAuthenticate } = require('../hybrid-auth')
const jwt = require("jsonwebtoken");
const db = require("../db.js"); // your DB connection
const router = express.Router()

const bcrypt = require('bcrypt')
const { Pool } = require('pg')
const crypto = require('crypto')

const authMiddleware = require('../middleware/authMiddleware');

// EMAIL PASSWORD

function signAccessToken(user) {
  const payload = { sub: user.id, email: user.email, name: user.name || null }
  return jwt.sign(payload, APP_JWT_SECRET || 'dev-secret', { expiresIn: APP_JWT_EXPIRES })
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
}

function signAccessToken(user) {
  const payload = { sub: user.id, email: user.email, name: user.name || null }
  return jwt.sign(payload, APP_JWT_SECRET || 'dev-secret', { expiresIn: APP_JWT_EXPIRES })
}

function setRefreshCookie(res, tokenPlain) {
  const days = Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30
  const maxAge = days * 24 * 60 * 60 * 1000
  res.cookie(REFRESH_COOKIE_NAME, tokenPlain, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge,
    path: '/'
  })
}

/* Store hashed refresh token and meta, return DB record (id) */
async function storeRefreshToken({ user_id, tokenPlain, ip=null, userAgent=null, expiresAt=null, replacedBy=null }) {
  const tokenHash = await bcrypt.hash(tokenPlain, 10)
  const rows = await dbQuery(
    `INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, created_at, expires_at, revoked, replaced_by)
     VALUES ($1,$2,$3,$4,now(),$5,false,$6) RETURNING id, user_id`,
    [user_id, tokenHash, ip, userAgent, expiresAt, replacedBy]
  )
  return rows[0]
}

/* Find refresh token DB row by comparing hashes (search recent rows) */
async function findRefreshTokenRowByPlain(user_id, tokenPlain) {
  const rows = await dbQuery(
    `SELECT id, user_id, token_hash, revoked, expires_at, replaced_by
     FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [user_id]
  )
  for (const row of rows) {
    // compare hash
    const match = await bcrypt.compare(tokenPlain, row.token_hash)
    if (match) return row
  }
  return null
}

/* Revoke a refresh token row by id */
async function revokeRefreshTokenById(id) {
  await dbQuery(`UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE id = $1`, [id])
}

router.get('/protected', authMiddleware, (req,res)=> {
  res.json({ message: 'ok', user: req.user })
})

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const userRes = await db.pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,email', [name, email, hash]);
  const user = userRes.rows[0];
  // create email verification token
  const token = crypto.randomBytes(32).toString('hex');
  await db.pool.query('INSERT INTO email_tokens(token,user_id,type,expires_at) VALUES($1,$2,$3,$4)', [token, user.id, 'verification', new Date(Date.now()+1000*60*60*24)]);
  // send verification email with link: https://app/verify?token=...
  res.json({ ok: true });
});

// Verify email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  const t = await db.pool.query('SELECT user_id FROM email_tokens WHERE token=$1 AND type=$2 AND expires_at>now()', [token, 'verification']);
  if (t.rowCount === 0) return res.status(400).json({ error: 'Invalid token' });
  await db.pool.query('UPDATE users SET email_verified=true WHERE id=$1', [t.rows[0].user_id]);
  await db.pool.query('DELETE FROM email_tokens WHERE token=$1', [token]);
  res.json({ ok: true });
});

// Refresh
router.post('/refresh', express.json(), async (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) return res.status(401).end();
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    const t = await db.pool.query('SELECT user_id FROM refresh_tokens WHERE token=$1 AND expires_at>now()', [token]);
    if (t.rowCount===0) return res.status(401).end();
    const user = await db.pool.query('SELECT id,name,email,role FROM users WHERE id=$1', [payload.sub]);
    const accessToken = signAccess(user.rows[0]);
    res.json({ accessToken, user: user.rows[0] });
  } catch (e) { return res.status(401).end(); }
});

// REFRESH TOKEN ENDPOINT
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    // const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    // if (!refreshToken) return res.status(401).end();

    // 1. Check if refresh token exists in DB
    const [rows] = await db.execute(
      "SELECT * FROM user_tokens WHERE refresh_token = ? LIMIT 1",
      [refreshToken]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokenRecord = rows[0];

    // 2. Verify refresh token signature
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err) => {
      if (err) return res.status(401).json({ message: "Expired refresh token" });
    });

    // 3. Generate a new access token
    const newAccessToken = jwt.sign(
      { userId: tokenRecord.user_id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post('/refresh', express.json(), async (req, res) => {
  try {
    const cookieToken = req.cookies && req.cookies[REFRESH_COOKIE_NAME]
    const bodyToken = req.body && req.body.refreshToken
    const tokenPlain = cookieToken || bodyToken

    if (!tokenPlain) return res.status(400).json({ error: 'No refresh token provided' })

    // We need to find which user this token belongs to.
    // Strategy: scan recent refresh_tokens rows and compare hashes for every user.
    // Optimization: if you store a token identifier in the cookie (e.g. token id), use that.
    // For simplicity: query most recent tokens and compare.
    // We'll fetch tokens from DB where not revoked and not expired.
    const candidateRows = await dbQuery(
      `SELECT id, user_id, token_hash, revoked, expires_at FROM refresh_tokens
       WHERE revoked = false
       ORDER BY created_at DESC
       LIMIT 1000`
    )

    let found = null
    for (const r of candidateRows) {
      if (await bcrypt.compare(tokenPlain, r.token_hash)) {
        found = r
        break
      }
    }

    if (!found) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token' })
    }

    // check expiry
    if (found.expires_at && new Date(found.expires_at) < new Date()) {
      // revoke as safety
      await revokeRefreshTokenById(found.id)
      return res.status(401).json({ error: 'Refresh token expired' })
    }

    // At this point, we have a valid refresh token row
    // Load user
    const users = await dbQuery('SELECT * FROM users WHERE id = $1 LIMIT 1', [found.user_id])
    const user = users[0]
    if (!user) {
      await revokeRefreshTokenById(found.id)
      return res.status(401).json({ error: 'User not found' })
    }

    // ROTATE: generate new refresh token, store it, mark old as revoked and set replaced_by
    const newRefreshPlain = generateRefreshToken()
    const expiresAt = new Date(Date.now() + (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) * 24 * 60 * 60 * 1000).toISOString()

    const newRow = await dbQuery(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, created_at, expires_at, revoked, replaced_by)
       VALUES ($1,$2,$3,$4,now(),$5,false,$6) RETURNING id`,
      [user.id, await bcrypt.hash(newRefreshPlain, 10), req.ip || null, req.get('User-Agent') || null, expiresAt, found.id]
    )

    // revoke the old
    await dbQuery('UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE id = $1', [found.id])

    // issue new access token
    const accessToken = signAccessToken(user)

    // set cookie with new refresh token
    setRefreshCookie(res, newRefreshPlain)

    res.json({ accessToken })
  } catch (err) {
    console.error('refresh error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Login
router.post('/login', express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
    // const r = await db.pool.query('SELECT id,name,email,password_hash,role,email_verified FROM users WHERE email=$1', [email]);
    const users = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
    if (users.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const u = users.rows[0];
    // const user = users[0]
    if (!u || !u.password_hash) return res.status(401).json({ error: 'Invalid credentials' })
    if (!u.email_verified) return res.status(403).json({ error: 'Verify email first' });
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const accessToken = signAccessToken(user)
    /* const accessToken = signAccess(u);
    const refreshToken = signRefresh(u);
    // store refresh token
    await db.pool.query('INSERT INTO refresh_tokens(token,user_id,expires_at) VALUES($1,$2,$3)', [refreshToken, u.id, new Date(Date.now()+30*24*3600*1000)]); */
    // generate refresh token, store hashed
    const refreshTokenPlain = generateRefreshToken()
    const expiresAt = new Date(Date.now() + (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) * 24 * 60 * 60 * 1000).toISOString()
    await storeRefreshToken({
      user_id: u.id,
      tokenPlain: refreshTokenPlain,
      ip: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.get('User-Agent') || null,
      expiresAt
    })

    // set cookie and respond
    setRefreshCookie(res, refreshTokenPlain)
    // set HttpOnly cookie with refresh token
    // res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 30*24*3600*1000 });
    res.json({ accessToken, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  }catch(err){
    console.error('login error', err)
    res.status(500).json({ error: 'Server error' })
  }
});

// Logout
router.post('/logout', async (req, res) => {
  const token = req.cookies.refresh_token;
  if (token) await db.pool.query('DELETE FROM refresh_tokens WHERE token=$1', [token]);
  res.clearCookie('refresh_token');
  res.json({ ok: true });
});
router.post('/logout', async (req, res) => {
  try {
    const cookieToken = req.cookies && req.cookies[REFRESH_COOKIE_NAME]
    const bodyToken = req.body && req.body.refreshToken
    const tokenPlain = cookieToken || bodyToken
    if (!tokenPlain) {
      // still clear cookie
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
      return res.json({ ok: true })
    }

    // Find and revoke
    const candidateRows = await dbQuery(
      `SELECT id, user_id, token_hash FROM refresh_tokens ORDER BY created_at DESC LIMIT 1000`
    )
    for (const r of candidateRows) {
      if (await bcrypt.compare(tokenPlain, r.token_hash)) {
        await revokeRefreshTokenById(r.id)
        break
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
    res.json({ ok: true })
  } catch (err) {
    console.error('logout error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// export default router;

module.exports = router