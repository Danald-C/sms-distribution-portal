const jwt = require('jsonwebtoken')
const { Pool } = require('pg')

const { APP_JWT_SECRET, DATABASE_URL } = process.env
const pool = new Pool({ connectionString: DATABASE_URL })

const secret = process.env.JWT_ACCESS_SECRET, duration = process.env.JWT_SECRET_EXPIRES || '15m';


// const token = jwt.sign({ userId: user.id, }, process.env.JWT_SECRET, { expiresIn: '7d', })

async function getUserById(id) {
  const res = await pool.query('SELECT id, email, name FROM users WHERE id = $1 LIMIT 1', [id])
  return res.rows[0] || null
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' })
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header' })

    const token = parts[1]
    let payload
    try {
      payload = jwt.verify(token, APP_JWT_SECRET || 'dev-secret')
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const user = await getUserById(payload.sub)
    if (!user) return res.status(401).json({ error: 'User not found' })

    req.user = user
    next()
  } catch (err) {
    console.error('authMiddleware error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

function getVerified(authHeader) {
  // console.log(authHeader)
  const token = authHeader.split(" ")[1];
  return jwt.verify(token, secret);
}

function verifyJWTMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token", });
    }

    try {
      // const token = authHeader.split(" ")[1];
  
      // const decoded = jwt.verify(token, secret);

        // req.user = decoded;
        req.user = getVerified(authHeader);;

        next();
    } catch {
        return res.status(401).json({ message: "Invalid token", });
    }
}

module.exports = {authMiddleware, verifyJWTMiddleware, getVerified, secret}