const express = require('express');
const router = express.Router();

const admin = require('firebase-admin')
const jwt = require('jsonwebtoken')
const jwksClient = require('jwks-rsa')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const db = require("./db.js"); // your DB connection

// FIREBASE GOOGLE AUTH / COGNITO ETC.

/* ------------------------------------------------------------------
  Backend: Node.js + Express (auth routes + user model)
  - Uses bcrypt for password hashing
  - JWT access tokens (short-lived) and refresh tokens (HttpOnly cookie)
  - Email verification and password reset tokens stored in DB
  - Role-based checks via middleware
-------------------------------------------------------------------*/

/* ========= Cognito JWKS client (optional) ========= */
let cognitoClient = null
if (db.envDefs.COGNITO_POOL_ID && db.envDefs.AWS_REGION) {
  // cognito issuer e.g. https://cognito-idp.{region}.amazonaws.com/{userPoolId}
  const issuer = `https://cognito-idp.${db.envDefs.AWS_REGION}.amazonaws.com/${db.envDefs.COGNITO_POOL_ID}`
  const jwksUri = `${issuer}/.well-known/jwks.json`
  cognitoClient = jwksClient({
    jwksUri,
    cache: true,
    rateLimit: true,
    timeout: 30000
  })
}

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
}
function signRefresh(user) {
  return jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: '30d' });
}

// Middleware: requireAuth
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).end();
  const parts = auth.split(' ');
  try {
    const payload = jwt.verify(parts[1], ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (e) { return res.status(401).end(); }
}

router.post('/login/hybrid', express.json(), hybridAuthenticate, async (req,res)=>{
  // assume hybridAuthenticate sets req.user and req.appAccessToken
  // set refresh cookie (implement setRefreshCookie in hybrid-auth helpers)
  res.json({ user: req.user, accessToken: req.appAccessToken })
})

// Middleware: requireRole('admin')
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).end();
    if (req.user.role !== role) return res.status(403).end();
    next();
  };
}

// Example protected route
router.get('/me', requireAuth, async (req, res) => {
  const u = await db.pool.query('SELECT id,name,email,role FROM users WHERE id=$1', [req.user.id]);
  res.json({ user: u.rows[0] });
});

async function hybridAuthenticate(req, res, next) {
  try {
    const idToken = (req.body && req.body.idToken) || (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[1]) || null

    if (!idToken) {
      return res.status(401).json({ error: 'No auth token provided' })
    }

    // Try Firebase
    let identity = null
    try {
      identity = await verifyFirebaseIdToken(idToken)
    } catch (e) {
      identity = null
    }

    // If firebase failed, try Cognito (if configured)
    if (!identity && cognitoClient) {
      identity = await verifyCognitoToken(idToken)
    }

    if (!identity) {
      return res.status(401).json({ error: 'Invalid auth token' })
    }

    // Upsert user in DB by email. If no email (rare), use provider_id
    const email = identity.email
    let user = null
    if (email) {
      user = await dbGetUserByEmail(email)
    } else {
      // Try find by provider_id
      const r = await dbQuery('SELECT * FROM users WHERE provider_id = $1 LIMIT 1', [identity.provider_id])
      user = r.rows[0] || null
    }

    if (!user) {
      // create user
      const newUser = await dbCreateUser({
        email: email,
        name: identity.name,
        provider: identity.provider,
        provider_id: identity.provider_id,
        meta: identity.meta
      })
      user = newUser
    } else {
      // update profile fields / meta
      user = await dbUpdateUser(user.id, {
        name: identity.name,
        provider: identity.provider,
        provider_id: identity.provider_id,
        meta: identity.meta
      })
    }

    // generate app access token
    const appAccessToken = createAppAccessToken(user)

    // generate refresh token plain and store hashed in DB
    const refreshTokenPlain = generateRefreshTokenPlain()
    // compute expiresAt timestamp for DB (ISO)
    const expiresAt = new Date(Date.now() + (Number(REFRESH_TOKEN_EXPIRES) || 30) * 24 * 60 * 60 * 1000).toISOString()
    await dbStoreRefreshToken({
      user_id: user.id,
      refreshTokenPlain,
      userAgent: req.get('User-Agent') || null,
      ip: req.ip || (req.headers['x-forwarded-for'] || null),
      expiresAt
    })

    // set refresh cookie
    setRefreshCookie(res, refreshTokenPlain)

    // attach to req and move on
    req.user = user
    req.appAccessToken = appAccessToken

    next()
  } catch (err) {
    console.error('hybridAuthenticate error:', err)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

/* Get user by email */
async function dbGetUserByEmail(email) {
  if (!email) return null
  const res = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
  return res.rows[0] || null
}

/* Create user stub */
async function dbCreateUser({ email, name, provider, provider_id, meta = {} }) {
  const res = await dbQuery(
    `INSERT INTO users (email, name, provider, provider_id, meta, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,now(),now())
     RETURNING *`,
    [email, name || null, provider || null, provider_id || null, meta]
  )
  return res.rows[0]
}

/* Update user stub */
async function dbUpdateUser(id, { name, provider, provider_id, meta = {} }) {
  const res = await dbQuery(
    `UPDATE users SET name = COALESCE($2, name), provider = COALESCE($3, provider), provider_id = COALESCE($4, provider_id), meta = meta || $5::jsonb, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, name, provider, provider_id, meta]
  )
  return res.rows[0]
}

/* Store refresh token (hash it first). Returns the raw refresh token (to send as cookie) */
async function dbStoreRefreshToken({ user_id, refreshTokenPlain, userAgent = null, ip = null, expiresAt = null }) {
  // hash token
  const saltRounds = 10
  const tokenHash = await bcrypt.hash(refreshTokenPlain, saltRounds)
  const res = await dbQuery(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, created_at, expires_at)
     VALUES ($1,$2,$3,$4,now(),$5)
     RETURNING id`,
    [user_id, tokenHash, userAgent, ip, expiresAt]
  )
  return res.rows[0]
}

/* Validate a refresh token against stored hashes (not used here, but handy) */
async function dbValidateRefreshToken(user_id, refreshTokenPlain) {
  const res = await dbQuery(
    `SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC`,
    [user_id]
  )
  for (const row of res.rows) {
    if (await bcrypt.compare(refreshTokenPlain, row.token_hash)) {
      return row
    }
  }
  return null
}



/* Verify Firebase ID token */
async function verifyFirebaseIdToken(idToken) {
  if (!admin.apps.length) return null
  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    // decoded contains: uid, email, name, picture, etc.
    return {
      provider: 'firebase',
      provider_id: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null,
      meta: decoded
    }
  } catch (e) {
    // invalid token
    return null
  }
}

/* Verify Cognito/JWT token (id/access token). Accepts a JWT and returns payload if valid. */
async function verifyCognitoToken(token) {
  if (!cognitoClient) return null
  try {
    // decode header to find kid
    const decodedHeader = jwt.decode(token, { complete: true })
    if (!decodedHeader || !decodedHeader.header) return null
    const kid = decodedHeader.header.kid
    if (!kid) return null

    // get signing key
    const key = await new Promise((resolve, reject) => {
      cognitoClient.getSigningKey(kid, (err, key) => {
        if (err) return reject(err)
        const pub = key.getPublicKey()
        resolve(pub)
      })
    })

    // verify
    const issuer = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_POOL_ID}`
    const payload = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer
      // you may also validate audience (aud) if you set APP_CLIENT_ID
    })

    // payload contains sub, email, email_verified, etc.
    return {
      provider: 'cognito',
      provider_id: payload.sub,
      email: payload.email || (payload.username || null),
      name: payload.name || null,
      meta: payload
    }
  } catch (e) {
    return null
  }
}

/* Create short-lived app access token (signed JWT) */
function createAppAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name || null
  }
  const token = jwt.sign(payload, APP_JWT_SECRET || 'dev-secret', {
    expiresIn: APP_JWT_EXPIRES
  })
  return token
}

/* Generate a cryptographically random refresh token (plain) */
function generateRefreshTokenPlain() {
  return crypto.randomBytes(48).toString('hex')
}

/* Set refresh cookie on response */
function setRefreshCookie(res, refreshTokenPlain) {
  const days = Number(REFRESH_TOKEN_EXPIRES) || 30
  const maxAge = days * 24 * 60 * 60 * 1000 // ms
  const cookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === 'production' ? true : false,
    sameSite: 'Lax',
    maxAge,
    path: '/'
  }
  res.cookie(REFRESH_COOKIE_NAME, refreshTokenPlain, cookieOptions)
}

/* Exported helpers for routes that may need to sign tokens or clear refresh cookie */
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
}


// Example Postgres DDL (users table)

/*
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text,
  role text NOT NULL DEFAULT 'user', -- user|org-admin|admin
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  role ENUM('user', 'org-admin', 'admin') NOT NULL DEFAULT 'user',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
  token text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE refresh_tokens (
  token TEXT PRIMARY KEY,
  user_id CHAR(36),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_refresh_tokens
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE email_tokens (
  token text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL, -- verification|password_reset
  expires_at timestamptz NOT NULL
);
CREATE TABLE email_tokens (
  token VARCHAR(512) PRIMARY KEY,
  user_id CHAR(36),
  type ENUM('verification', 'password_reset') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_email_tokens
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
*/

module.exports = {
  hybridAuthenticate,
  // exported for other routes to sign app tokens or manage refresh tokens
  createAppAccessToken,
  generateRefreshTokenPlain,
  dbValidateRefreshToken,
  clearRefreshCookie,
  // DB helpers exported for convenience (you can also import db.js in your project)
  dbGetUserByEmail,
  dbCreateUser,
  dbUpdateUser
};