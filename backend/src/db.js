const { Pool } = require('pg')
const admin = require('firebase-admin')
// const { tryCatch } = require('bullmq')


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
// async function dbGetUserByEmail(email) {
// async function tableGetRow(table, {column, cell}) {
async function tableGetRows(table, data, extra={orderBy: null, desc: null, limit: null, offset: null}) {
  let getKeys = Object.keys(data), getValues = Object.values(data);
  try{
    // if (!column || !cell) return null
    if (getKeys.length === 0 || getValues.length === 0) return null
    // const res = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
    /* let query = `SELECT * FROM ${table} WHERE `;
    getKeys.map((column, i) => {
      query += `${column} = $${i+1}`;
      query += i < getKeys.length-1 ? ` AND ` : ``;
    }); */
    let query = `SELECT * FROM ${table}`;
    if(getKeys.length > 0){
      query += ` WHERE `;
      getKeys.map((column, i) => {
        query += `${column} = $${i+1}`;
        query += i < getKeys.length-1 ? ` AND ` : ``;
      });
    }
    // query += ` LIMIT 1`;
    // query += ` ORDER BY id DESC LIMIT $1 OFFSET $2`;
    query += extra.orderBy ? ` ORDER BY ${extra.orderBy}` : ``;
    query += extra.desc ? ` ${extra.desc}` : ``;

    if(extra.limit){
      getValues.push(extra.limit);
      query +=  ` LIMIT $${getValues.length}`;
    }
    if(extra.offset){
      getValues.push(extra.offset);
      query += ` OFFSET $${getValues.length}`;
    }
    
    const res = await dbQuery(query, getValues)
    console.log(data);
    
    return res || null
  }catch(error){
    // console.error(`Error fetching row from ${table} where ${column} = ${cell}:`, error)
    let str = `Error fetching row from ${table} where `;
    getKeys.map((column, i) => {
      str += `${column} = ${getValues[i]}`;
      str += i < getKeys.length-1 ? ` and ` : ``;
    })
    console.error(`${str}:`, error)
    return null
  }
}

/* Create user stub */
// async function dbCreateUser({ name, email, provider, provider_id, meta = {} }) {
async function dbCreateUser({ name, email, google_id, profile_picture, phone_number }) {
  let result = await dbQuery(
    // `INSERT INTO users (email, name, provider, provider_id, meta, created_at, updated_at)
    `INSERT INTO users (full_name, email, google_id, profile_picture, phone_number, created_at)
     VALUES ($1,$2,$3,$4,$5,now())
     RETURNING *`,
    [name || null, email, google_id || null, profile_picture || null, phone_number]
  );

  return result[0];
}

async function tablecreateRow(table, data) {
  try{
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
    console.log(`INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`)
    const values = Object.values(data);
    const result = await dbQuery(`INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`, values);

    return result[0];
  }catch(error){
    console.error(`Error creating data:`, error)
    return null
  }
}

/* Update user stub */
async function dbUpdateUser(id, { name, provider, provider_id, meta = {} }) {
  const res = await dbQuery(`UPDATE users SET name = COALESCE($2, name), provider = COALESCE($3, provider), provider_id = COALESCE($4, provider_id), meta = meta || $5::jsonb, updated_at = now() WHERE id = $1 RETURNING *`, [id, name, provider, provider_id, meta])
  
  return res.rows[0]
}
async function tableUpdateRow(table, dataObj) {
  try{
    // {field: value, field: value, field: value}
    let getKeys = Object.keys(dataObj), firstKey = getKeys.slice(0, 1)[0], skipFirstK = getKeys.slice(1, getKeys.length), getValues = Object.values(dataObj), skipFirstV = getValues.slice(1, getValues.length);
    let updateQuery = `UPDATE ${table} SET `;

    if (getKeys.length < 2 || getValues.length < 2) return null;
    
    // console.log(skipFirstV)
    skipFirstK.forEach((key, i) => {
      updateQuery += `${key} = COALESCE($${i+2}, ${key})`
      /* if(i < skipFirstK.length-1){
        updateQuery += ', '
      }else{
        updateQuery += ' '
      } */
      updateQuery += (i < skipFirstK.length-1) ? ', ' : ' ';
    });
    updateQuery += `WHERE ${firstKey} = $1 RETURNING *`;

    const res = await dbQuery(updateQuery, getValues)

    return res[0];
  }catch(error){
    //
  }
}

// async function removeUser(table, {column, cell}) {
async function removeUser(table, data) {
  let getKeys = Object.keys(data), getValues = Object.values(data);
  try{
    if (getKeys.length === 0 || getValues.length === 0) return null
    // console.log('Pruning revoked tokens older than 90 days...');
    // await pool.query("DELETE FROM refresh_tokens WHERE revoked = true AND revoked_at < now() - interval '90 days'");
    let query = `DELETE FROM ${table} WHERE `;
    getKeys.map((column, i) => {
      query += `${column} = '${getValues[i]}'`;
      query += i < getKeys.length-1 ? ` AND ` : ``;
    });
    // await pool.query(`DELETE FROM ${table} WHERE ${column} = '${cell}'`);
    await pool.query(query);
    // console.log('Done pruning.');

    return { success: true }
  }catch(error){
    console.error(`Error deleting data:`, error)
    return null
  }
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
  // await pool.end();
// run().catch(e=>{ console.error(e); process.exit(1); });

async function getUsers(page=1, limit=10){

  const offset = (page - 1) * limit;

  const query = `
    SELECT
      id,
      full_name,
      email,
      phone_number,
      phone_verified
    FROM users
    ORDER BY id DESC
    LIMIT $1
    OFFSET $2
  `;

  return await dbQuery(
    query,
    [limit, offset]
  );
}


// *** DATABASE ARCHETECTURE
// Phone Numbers Table: id, user_id, phone_number, country_code, country_name
// Group Table: id, user_id, group_name, group_description
// Group & Numbers Association Table: group_id, phone_number_id

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
);

CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    country_code VARCHAR(10),
    country_name VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(10),
    verification_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
); */

module.exports = {envDefs, pool, dbObj, functions: { tablecreateRow, tableGetRows, removeUser, tableUpdateRow, getUsers }}