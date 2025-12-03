const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json'); // download from Firebase console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Endpoint: POST /api/auth/firebase-login
router.post('/firebase-login', async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    const name = decoded.name || email;
    let user = await pool.query('SELECT id,name,email,role FROM users WHERE email=$1', [email]);
    if (user.rowCount === 0) {
      const r = await pool.query('INSERT INTO users(name,email,email_verified,role) VALUES($1,$2,true,$3) RETURNING id,name,email,role', [name, email, 'user']);
      user = { rows: [r.rows[0]] };
    }
    const u = user.rows[0];
    const accessToken = signAccess(u);
    const refreshToken = signRefresh(u);
    await pool.query('INSERT INTO refresh_tokens(token,user_id,expires_at) VALUES($1,$2,$3)', [refreshToken, u.id, new Date(Date.now()+30*24*3600*1000)]);
    res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 30*24*3600*1000 });
    res.json({ accessToken, user: u });
  } catch (err) {
    console.error('Firebase verify failed', err);
    res.status(401).json({ error: 'Invalid Firebase token' });
  }
});