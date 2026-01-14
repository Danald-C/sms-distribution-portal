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
  NODE_ENV,
  REFRESH_TOKEN_EXPIRES_DAYS = '30',
} = process.env

const envDefs = {COGNITO_POOL_ID, AWS_REGION}

const DATABASE_URL = {
    user: DB_USER,
    host: DB_HOST || 'postgres',
    database: DB_NAME,
    password: DB_PASSWORD,
    port: Number(DB_PORT) || 5432,
    ssl: false, // or true if using managed db
  }


/*  DB_USER = 'dcadmin'
DB_PASSWORD = 'dcadmin'
DB_HOST = 'localhost'
DB_NAME = 'dc_sms_portal_db'
DB_PORT = 5433

DATABASE_URL=postgres://postgres:postgres@db:5432/dc_sms_portal_db */

const dbObj = {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_NAME,
  DB_PORT
}

/* ========= Initialize Postgres pool ========= */
const pool = new Pool(DATABASE_URL)

/* Utility: query helper */
async function dbQuery(queryText, params) {
  const client = await pool.connect()
  try {
    return (await client.query(queryText, params)).rows
  } finally {
    client.release()
  }
}

/* DELETE FROM user_tokens
WHERE expires_at IS NOT NULL
  AND expires_at < NOW();
// Optional: auto-delete expired tokens. You could later run that as a cron job.

If you want revoked tokens to always have a timestamp:
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE revoked = TRUE AND revoked_at IS NULL; */

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

async function run() {
  // console.log('Pruning revoked tokens older than 90 days...');
  await pool.query("DELETE FROM refresh_tokens WHERE revoked = true AND revoked_at < now() - interval '90 days'");
  // console.log('Done pruning.');
  await pool.end();
}
run().catch(e=>{ console.error(e); process.exit(1); });

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
ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ NULL;


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
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_user_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

If you want refresh tokens to expire (recommended), you can update them like this:

ALTER TABLE user_tokens
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id
    ON user_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_user_tokens_created_at
    ON user_tokens (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tokens_refresh_token
    ON user_tokens (refresh_token);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked
ON refresh_tokens (revoked);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at
ON refresh_tokens (revoked_at);


CREATE TABLE IF NOT EXISTS auth_incidents (
  id serial PRIMARY KEY,
  user_id integer NULL,
  incident_type text NOT NULL,
  detail jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
); */

module.exports = {envDefs, pool, execute, dbObj}