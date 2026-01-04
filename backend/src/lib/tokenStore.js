const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function dbQuery(q, params) {
  const c = await pool.connect();
  try { const r = await c.query(q, params); return r.rows; } finally { c.release(); }
}

function generateTokenPlain() {
  return crypto.randomBytes(48).toString('hex');
}
function makeCookieValue(tokenId, tokenPlain) {
  return `${tokenId}.${tokenPlain}`;
}

async function storeRefreshTokenRow({ user_id, tokenPlain = null, tokenId = null, ip = null, userAgent = null, expiresAt = null, replacedBy = null }) {
  tokenPlain = tokenPlain || generateTokenPlain();
  tokenId = tokenId || uuidv4();
  const tokenHash = await bcrypt.hash(tokenPlain, 10);
  await dbQuery(
    `INSERT INTO refresh_tokens (token_id, user_id, token_hash, ip, user_agent, created_at, expires_at, revoked, replaced_by)
     VALUES ($1,$2,$3,$4,$5,now(),$6,false,$7)`,
    [tokenId, user_id, tokenHash, ip, userAgent, expiresAt, replacedBy]
  );
  return { tokenId, tokenPlain };
}

async function getRefreshRowByTokenId(tokenId) {
  if (!tokenId) return null;
  const rows = await dbQuery('SELECT * FROM refresh_tokens WHERE token_id = $1 LIMIT 1', [tokenId]);
  return rows[0] || null;
}

async function revokeRefreshRowByTokenId(tokenId) {
  await dbQuery('UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE token_id = $1', [tokenId]);
}

async function revokeAllTokensForUser(userId) {
  await dbQuery('UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE user_id = $1', [userId]);
}

module.exports = {
  storeRefreshTokenRow,
  getRefreshRowByTokenId,
  revokeRefreshRowByTokenId,
  revokeAllTokensForUser,
  makeCookieValue
};