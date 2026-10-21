const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

async function dbQuery(query, params = []) {
  const result = await pool.query(query, params);
  return result.rows;
}

function generateTokenPlain() {
  return crypto.randomBytes(48).toString('hex');
}

function makeCookieValue(tokenId, tokenPlain) {
  return `${tokenId}.${tokenPlain}`;
}

async function storeRefreshTokenRow({
  user_id,
  tokenPlain = null,
  tokenId = null,
  ip = null,
  userAgent = null,
  expiresAt,
  replacedBy = null
}) {
  if (!user_id) {
    throw new Error('user_id is required to store a refresh token');
  }

  if (!expiresAt) {
    throw new Error('expiresAt is required to store a refresh token');
  }

  const plain = tokenPlain || generateTokenPlain();
  const id = tokenId || uuidv4();
  const tokenHash = await bcrypt.hash(plain, 10);

  await dbQuery(
    `INSERT INTO public.refresh_tokens (
      token_id,
      user_id,
      token_hash,
      ip,
      user_agent,
      expires_at,
      revoked,
      replaced_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
    [
      id,
      user_id,
      tokenHash,
      ip,
      userAgent,
      expiresAt,
      replacedBy
    ]
  );

  return {
    tokenId: id,
    tokenPlain: plain
  };
}

async function getRefreshRowByTokenId(tokenId) {
  if (!tokenId) return null;

  const rows = await dbQuery(
    `SELECT *
     FROM public.refresh_tokens
     WHERE token_id = $1
     LIMIT 1`,
    [tokenId]
  );

  return rows[0] || null;
}

async function revokeRefreshRowByTokenId(tokenId) {
  if (!tokenId) return;

  await dbQuery(
    `UPDATE public.refresh_tokens
     SET revoked = true,
         revoked_at = COALESCE(revoked_at, NOW())
     WHERE token_id = $1
       AND revoked = false`,
    [tokenId]
  );
}

async function revokeAllTokensForUser(userId) {
  if (!userId) return;

  await dbQuery(
    `UPDATE public.refresh_tokens
     SET revoked = true,
         revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id = $1
       AND revoked = false`,
    [userId]
  );
}

async function rotateRefreshToken({
  oldTokenId,
  userId,
  tokenPlain,
  tokenId,
  ip = null,
  userAgent = null,
  expiresAt
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock and validate the existing token.
    const oldResult = await client.query(
      `SELECT *
       FROM public.refresh_tokens
       WHERE token_id = $1
       FOR UPDATE`,
      [oldTokenId]
    );

    const oldToken = oldResult.rows[0];

    if (
      !oldToken ||
      oldToken.user_id !== userId ||
      oldToken.revoked ||
      new Date(oldToken.expires_at) <= new Date()
    ) {
      throw new Error('REFRESH_TOKEN_INVALID');
    }

    // Insert the replacement token.
    const tokenHash = await bcrypt.hash(tokenPlain, 10);

    await client.query(
      `INSERT INTO public.refresh_tokens (
        token_id,
        user_id,
        token_hash,
        ip,
        user_agent,
        expires_at,
        revoked
      )
      VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [tokenId, userId, tokenHash, ip, userAgent, expiresAt]
    );

    // Revoke the previous token and link it to its replacement.
    await client.query(
      `UPDATE public.refresh_tokens
       SET revoked = true,
           revoked_at = NOW(),
           replaced_by = $2
       WHERE token_id = $1`,
      [oldTokenId, tokenId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  storeRefreshTokenRow,
  getRefreshRowByTokenId,
  revokeRefreshRowByTokenId,
  revokeAllTokensForUser,
  makeCookieValue,
  rotateRefreshToken
};