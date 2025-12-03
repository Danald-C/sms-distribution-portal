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

CREATE TABLE refresh_tokens (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  user_agent text,
  ip text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
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