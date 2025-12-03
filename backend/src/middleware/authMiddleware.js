const jwt = require('jsonwebtoken')
const { Pool } = require('pg')

const { APP_JWT_SECRET, DATABASE_URL } = process.env
const pool = new Pool({ connectionString: DATABASE_URL })

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

module.exports = authMiddleware