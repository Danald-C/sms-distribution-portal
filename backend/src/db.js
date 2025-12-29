const { Pool } = require('pg')
const admin = require('firebase-admin')


const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_NAME,
  DB_PORT,
  APP_JWT_SECRET,
  APP_JWT_EXPIRES = '15m',
  REFRESH_TOKEN_EXPIRES = '30', // days
  COGNITO_POOL_ID,
  AWS_REGION,
  FIREBASE_SERVICE_ACCOUNT, // path to service account JSON or JSON string
  REFRESH_COOKIE_NAME = 'sms_refresh',
  NODE_ENV
} = process.env

const envDefs = {COGNITO_POOL_ID, AWS_REGION}

const DATABASE_URL = {
    user: DB_USER,
    host: DB_HOST,
    database: DB_NAME,
    password: DB_PASSWORD,
    port: DB_PORT,
  }

/* ========= Initialize Postgres pool ========= */
const pool = new Pool({
  connectionString: DATABASE_URL,
  // optionally add ssl config if needed in production
})
console.log('Postgres pool initialized.', DATABASE_URL)

if (!DATABASE_URL) {
  console.warn('Warning: DATABASE_URL not set. DB calls will fail until configured.')
}
if (!APP_JWT_SECRET) {
  console.warn('Warning: APP_JWT_SECRET not set. App tokens will be unsigned/insecure until configured.')
}

/* ========= Initialize Firebase admin if service account provided ========= */
try {
  if (FIREBASE_SERVICE_ACCOUNT && !admin.apps.length) {
    let sa
    try {
      // If the env var contains JSON string, parse it; otherwise treat as a path
      sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
    } catch (e) {
      // assume it's a path to file
      sa = require(FIREBASE_SERVICE_ACCOUNT)
    }
    admin.initializeApp({
      credential: admin.credential.cert(sa)
    })
    console.log('Firebase admin initialized.')
  }
} catch (e) {
  console.warn('Unable to initialize firebase-admin:', e && e.message)
}

/* Utility: query helper */
async function dbQuery(queryText, params) {
  const client = await pool.connect()
  try {
    return (await client.query(queryText, params)).rows
  } finally {
    client.release()
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

async function execute(query){
  try{
    //
  }catch(err){
    //
  }
}

/* CREATE TABLE users (
  id serial PRIMARY KEY,
  email text UNIQUE,
  name text,
  provider text,
  provider_id text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
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
CREATE TABLE users ( // MySQL version
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
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  user_agent text,
  ip text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
CREATE TABLE refresh_tokens (
  token text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE refresh_tokens ( // MySQL version
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
CREATE TABLE email_tokens ( // MySQL version
  token VARCHAR(512) PRIMARY KEY,
  user_id CHAR(36),
  type ENUM('verification', 'password_reset') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_email_tokens
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    refresh_token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
If you want refresh tokens to expire (recommended), you can update them like this:

ALTER TABLE user_tokens
ADD COLUMN expires_at TIMESTAMP NULL AFTER created_at; */

module.exports = {envDefs, pool, execute}