const express = require('express');
const { hybridAuthenticate } = require('../hybrid-auth')
const jwt = require("jsonwebtoken");
const db = require("../db.js"); // your DB connection
const router = express.Router()

const bcrypt = require('bcrypt')
const { Pool } = require('pg')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid');
const nodemailer = require("nodemailer");

// const Middlewares = require('../middleware/authMiddleware');
const {authMiddleware, verifyJWTMiddleware, getVerified, emailTransporter, environmentV} = require('../middleware/authMiddleware');
const oAuth = require('../api/auth/oAuthController')
const { preSMS_Send } = require('./sms')
const { requestSendMail } = require('../lib/email.js');

const { redis, REUSE_WINDOW_SEC } = require('../lib/redisClient');
// const { sendReuseAlert } = require('../lib/email');

const tokenStore = require('../lib/tokenStore');

const {
  REFRESH_TOKEN_EXPIRES_DAYS = '30',
  REFRESH_COOKIE_NAME = 'sms_refresh',
  NODE_ENV
} = process.env;

const defaultUnit = 30;
const generateOTP = () => {
  const newOTP = Math.floor(100000 + Math.random() * 900000).toString(), otpMessage = `Your OTP is ${newOTP}. It expires in 10 minutes.`, otpMessFrom = "DC Soft";
  const expiresAt = new Date(Date.now() + 10*60*1000) // 10 minutes from now
  // Date.now() + 5 * 60 * 1000

  return {newOTP, otpMessage, otpMessFrom, expiresAt}
}

async function dbQuery(query, params = []) {
  const result = await db.pool.query(query, params);
  return result.rows;
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

async function issueRefreshCookie(req, res, userId) {
  if (!userId) {
    throw new Error('Cannot issue refresh token without a user ID');
  }

  const tokenPlain = generateRefreshToken(48);
  const tokenId = uuidv4();

  const days = Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30;

  const expiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  );

  await tokenStore.storeRefreshTokenRow({
    user_id: userId,
    tokenPlain,
    tokenId,
    ip: req.ip || null,
    userAgent: req.get('User-Agent') || null,
    expiresAt
  });

  setRefreshCookie(res, tokenId, tokenPlain);
}





/* Store hashed refresh token and meta, return DB record (id) */
async function storeRefreshToken({ user_id, tokenPlain, ip=null, userAgent=null, expiresAt=null, replacedBy=null }) {
  const tokenHash = await bcrypt.hash(tokenPlain, 10)
  const rows = await dbQuery(
    `INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, created_at, expires_at, revoked, replaced_by)
     VALUES ($1,$2,$3,$4,now(),$5,false,$6) RETURNING id, user_id`,
    [user_id, tokenHash, ip, userAgent, expiresAt, replacedBy]
  )
  return rows[0]
}

/* Find refresh token DB row by comparing hashes (search recent rows) */
async function findRefreshTokenRowByPlain(user_id, tokenPlain) {
  const rows = await dbQuery(
    `SELECT id, user_id, token_hash, revoked, expires_at, replaced_by
     FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [user_id]
  )
  for (const row of rows) {
    // compare hash
    const match = await bcrypt.compare(tokenPlain, row.token_hash)
    if (match) return row
  }
  return null
}

/* Revoke a refresh token row by id */
async function revokeRefreshTokenById(id) {
  await dbQuery(`UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE id = $1`, [id])
}

// router.post('/google-oauth', async (req, res) => {
router.post('/register-google', async (req, res) => {
  try {
    // Validate the Google credential.
    const oAuth_res = await oAuth(req, res);

    if (!oAuth_res || !oAuth_res.success || !oAuth_res.user) {
      return res.status(401).json({
        Success: false,
        error: 'Google authentication failed'
      });
    }

    // Find or create the application user.
    const authentication = await authenticateUser({
      full_name: oAuth_res.user.name,
      email: oAuth_res.user.email,
      phone_number: '',
      password: '',
      google_id: oAuth_res.user.google_id,
      profile_picture: oAuth_res.user.picture
    }, 1);

    if(authentication.newUser.new){
      await db.functions.tableUpdateRow("public.users", { id: authentication.user.id, email_verified: true, updated_at: new Date() });
      welcomeUserSetup(authentication.user);
    }

    // Issue a refresh cookie for the authenticated user.
    await issueRefreshCookie(req, res, authentication.user.user_id);

    return res.json({
      Success: true,
      token: authentication.jwtToken,
      user: authentication.user,
      allData: authentication.allData,
      newUser: authentication.newUser
    });

  } catch (error) {
    // Do not log access tokens or refresh tokens.
    console.error('Google OAuth error:', error.message);

    return res.status(500).json({
      Success: false,
      error: 'Google authentication failed'
    });
  }
});

// router.post('/usersign-oauth', async (req, res)=> {
router.post('/register-number', async (req, res)=> {
  try{
    // console.log(req.body)
    // let authentication = await authenticateUser({ full_name: req.body.name, email: req.body.email, google_id: 'gid_0', profile_picture: "none" });
    let authentication = await authenticateUser({ full_name: req.body.name, email: req.body.email, phone_number: req.body.number, password: req.body.password, profile_picture: "none" });

    // Issue a refresh cookie for the authenticated user.
    await issueRefreshCookie(req, res, authentication.user.user_id);
    
    let returnedData = {Success: true, token: authentication.jwtToken, user: authentication.user, allData: authentication.allData, newUser: authentication.newUser };
    res.json(returnedData)
  }catch(error){
    console.log('oAuth_err', error)
    res.json( {Success: false, Error: `User sign authentication failed: ${error}`} );
  }
});

async function authenticateUser(user, type=0) {
    // let userData = await db.functions.tableGetRows("users", { email: user.email }), thisUser = userData.data[0], newUser = false;
    // let userData = await db.functions.tableGetRows("users", { email: user.email, phone_number: user.phone_number }), thisUser = userData.data[0], newUser = false;
    let userData = await db.functions.tableGetRows("users", { email: user.email, phone_number: user.phone_number }), thisUser = userData.data[0], newUser = {taken: false, new: false};

    if(!thisUser){ // User does not exist yet, create it.
    // if(!thisUser || thisUser && !await bcrypt.compare(thisUser.password, user.password)){ // User does not exist yet, create it.
      // let getAll = await db.functions.tableGetRows("users", {});
      // thisUser = await db.functions.tableCreateRow("users", {...user, google_id: `gid_${getAll.data.length}`, unit_1: defaultUnit, unit_1_created_at: new Date(), unit_2: 0});
  
      const passwordHash = await bcrypt.hash(user.password, 12);
      thisUser = await db.functions.tableCreateRow("users", {...user, password: passwordHash, google_id: (type == 1) ? user.google_id : `local_${uuidv4()}`, unit_1: defaultUnit, unit_1_created_at: new Date(), unit_2: 0});

      // newUser = true;
      newUser = {...newUser, new: true}
    }else{
      // console.log("AUTH: ", thisUser, await bcrypt.compare(user.password, thisUser.password), [user.password, thisUser.password])    
      if(await bcrypt.compare(thisUser.password, user.password)){
      // if(await bcrypt.compare(user.password, thisUser.password)){
        // if(!thisUser.phone_verified){
        if(!thisUser.email_verified && !thisUser.phone_verified){
          if(user.full_name) thisUser = await db.functions.tableUpdateRow("users", {id: thisUser.id, full_name: user.full_name }); // If a new name came this time, then save
          // newUser = true;
          newUser = {...newUser, new: true};
        }
      }else{
        newUser = {...newUser, taken: true};
      }
    }
    const [
      phone_numbers,
      phone_number_groups,
      phoneNumGrpAssociations
    ] = await Promise.all([
      db.functions.tableGetRows('phone_numbers', { user_id: thisUser.id }, {orderBy: "id", desc: "ASC", page: 1, limit: 10}),
      db.functions.tableGetRows('phone_number_groups', { user_id: thisUser.id }, {orderBy: "id", desc: "ASC", page: 1, limit: 10}),
      db.functions.tableGetRows("pngroups_and_pn_association", { user_id: thisUser.id })
    ]);
    
    let otherData = {user_info: {unit_1: thisUser.unit_1, unit_2: thisUser.unit_2}, phone_numbers, phone_number_groups, phoneNumGrpAssociations}
    // let user = {user_id: thisUser.id, ...user};
    // let jwtToken = signAccessToken({user});
    let thisName = user.full_name || thisUser.full_name, signThis = {...user, user_id: thisUser.id, full_name: thisName };
    let jwtToken = signAccessToken(signThis);

    // return {jwtToken, user: signThis, newUser, allData: otherData};
    return {jwtToken, user: signThis, newUser, allData: otherData};
}

// Register a new email/password account.
router.post('/register-email', async (req, res) => {
  const client = await db.pool.connect();

  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;

    // Validate the submitted fields.
    if (!name || name.length > 150) {
      return res.status(400).json({
        error: 'Please provide a valid name.'
      });
    }

    /* if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        error: 'Please provide a valid email address.'
      });
    } */
    if(!validateString(email)) return res.status(400).json({
      error: 'Please provide a valid email address.'
    });

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({
        error: 'Your password must be between 8 and 128 characters.'
      });
    }

    // Check email configuration before creating an account.
    if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_PASSWORD) {
      console.error('Registration email configuration is missing.');

      return res.status(503).json({
        error: 'Email verification is temporarily unavailable.'
      });
    }

    // !!-------------------------------!!
    // !!-------------------------------!!

    // Hash the password and create a one-time verification token.
    const passwordHash = await bcrypt.hash(password, 12);
    // const rawToken = crypto.randomBytes(32).toString('hex');
    const rawToken = generateRefreshToken(32);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query('BEGIN');

    // Use the actual database columns.
    // google_id is required by the existing schema, even for local accounts.
    /* const userResult = await client.query(
      `INSERT INTO public.users
         (full_name, email, password, google_id, email_verified)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, full_name, email`,
      [
        name,
        email,
        passwordHash,
        `local_${uuidv4()}`
      ]
    ); */
    let authentication = await authenticateUser({ full_name: name, email: email, email_verified: false, phone_number: req.body?.number, password, profile_picture: "none" });

    // const user = userResult.rows[0];
    const user = authentication.user;

    // Store only the hash, never the raw verification token.
    await client.query(
      `INSERT INTO public.email_tokens
         (token_hash, user_id, type, expires_at)
       VALUES ($1, $2, 'verification', $3)`,
      // [tokenHash, user.id, expiresAt]
      [tokenHash, user.user_id, expiresAt]
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.dcsmsportal.com').replace(/\/+$/, '');
    const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

    // console.log('TOKEN: ', encodeURIComponent(rawToken));
    requestSendMail({
      from: null,
      to: user.email,
      subject: 'Verify your DC SMS Portal email address',
      text: `Hello ${user.full_name},\n\nPlease verify your email address by opening this link:\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you did not request this account, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>Verify your email address</h2><p>Hello,</p><p>Thank you for registering with DC SMS Distribution Portal. Please verify your email address to activate your account.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify email address</a></p><p>This link expires in 24 hours.</p><p>If you did not request this account, you can ignore this email.</p></div>` 
    });

    await client.query('COMMIT');

    return res.status(201).json({
      Success: true,
      // newUser: true,
      message: 'Registration successful. Please check your email to verify your account.',
      // token: authentication.jwtToken,
      // user: authentication.user,
      // allData: authentication.allData,
      newUser: authentication.newUser
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'An account with this email address already exists.'
      });
    }

    console.error('Registration error:', error.message);

    return res.status(500).json({
      error: 'Registration failed. Please try again.'
    });
  } finally {
    client.release();
  }
});


// Verify an email address using a one-time token.
router.post('/verify-email', async (req, res) => {
  const client = await db.pool.connect();

  try {
    const token = req.body?.token;

    /* if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        error: 'The verification link is invalid or expired.'
      });
    } */
    if(!validateString(token, 1)) return res.status(400).json({error: 'The verification link is invalid or expired.'});

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    await client.query('BEGIN');

    const tokenResult = await client.query(
      `SELECT user_id
       FROM public.email_tokens
       WHERE token_hash = $1
         AND type = 'verification'
         AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'The verification link is invalid or expired.'
      });
    }

    const userId = tokenResult.rows[0].user_id;
    let returnedUser = await db.functions.tableGetRows("users", { id: userId });

    /* await client.query(
      `UPDATE public.users
       SET email_verified = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    ); */
    await db.functions.tableUpdateRow("public.users", { id: returnedUser.data[0].id, email_verified: true, updated_at: new Date() });

    // Remove the token so it cannot be reused.
    await client.query(`DELETE FROM public.email_tokens WHERE token_hash = $1`, [tokenHash]);
    // await db.functions.removeUser('public.email_tokens', { token_hash: tokenHash });

    await client.query('COMMIT');

    welcomeUserSetup(returnedUser);

    // console.log("Did we get here?");
    return res.json({ok: true, message: 'Your email has been verified. You can now sign in.'});
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    console.error('Email verification error:', error.message);

    return res.status(500).json({error: 'Email verification failed. Please try again.'});
  } finally {
    client.release();
  }
});

// Request a password-reset email.
router.post('/forgot-password-email', async (req, res) => {
  // const email = String(req.body?.email || '').trim().toLowerCase();
  const email = String(req.body?.email || '').trim().toLowerCase();
  // console.log("Did we get here?", req.body)

  // Use the same public response regardless of whether the account exists.
  const successResponse = {
    ok: true,
    message:
      'If an account exists for that email address, a password-reset link will be sent.'
  };

  /* if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(200).json(successResponse);
  } */
  if(!validateString(email)) return res.status(200).json(successResponse);

  if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_PASSWORD) {
    console.error('Password-reset email configuration is missing.');

    return res.status(503).json({
      error: 'Password recovery is temporarily unavailable. Please try again later.'
    });
  }

  const client = await db.pool.connect();

  try {
    const userResult = await client.query(
      `SELECT id, full_name, email
       FROM public.users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email]
    );

    // Do not disclose whether the account exists.
    if (userResult.rowCount === 0) {
      return res.status(200).json(successResponse);
    }

    const user = userResult.rows[0];

    // Generate a cryptographically secure, one-time token.
    // const rawToken = crypto.randomBytes(32).toString('hex');
    const rawToken = generateRefreshToken(32);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Password-reset links expire after 30 minutes.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.dcsmsportal.com').replace(/\/+$/, '');
    // const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const resetUrl = `${frontendUrl}/reset-password?type=email&token=${encodeURIComponent(rawToken)}`;

    // Replace any previously issued password-reset tokens for this user.
    await client.query('BEGIN');

    // First clear records
    /* await client.query(
      `DELETE FROM public.email_tokens
       WHERE user_id = $1
         AND type = 'password_reset'`,
      [user.id]
    ); */
    await db.functions.removeUser('public.email_tokens', { user_id: user.id, type: 'password_reset' });

    // Create a new record
    /* await client.query(
      `INSERT INTO public.email_tokens
         (token_hash, user_id, type, expires_at)
       VALUES ($1, $2, 'password_reset', $3)`,
      [tokenHash, user.id, expiresAt]
    ); */
    await db.functions.tableCreateRow('public.email_tokens', { token_hash: tokenHash, user_id: user.id, type: 'password_reset', expires_at: expiresAt });

    // Send the email before committing, matching the existing
    // registration-verification pattern.
    requestSendMail({
      from: null,
      to: user.email,
      subject: 'Reset your DC SMS Portal password',
      text: `Hello ${user.full_name || 'there'},\n\n` +
        `We received a request to reset your password.\n\n` +
        `Open this link to choose a new password:\n${resetUrl}\n\n` +
        `This link expires in 30 minutes and can only be used once.\n\n` +
        `If you did not request a password reset, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2>Reset your password</h2>
          <p>Hello ${String(user.full_name || 'there').replace(/[&<>"']/g, '')},</p>
          <p>We received a request to reset your DC SMS Portal password.</p>
          <p>
            <a
              href="${resetUrl}"
              style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px"
            >
              Reset password
            </a>
          </p>
          <p>This link expires in 30 minutes and can only be used once.</p>
          <p>If you did not request a password reset, you can ignore this email.</p>
        </div>` 
    });

    await client.query('COMMIT');

    return res.status(200).json(successResponse);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    console.error('Password-reset request failed:', error.message);

    return res.status(500).json({
      error: 'Unable to process your request. Please try again later.'
    });
  } finally {
    client.release();
  }
});

router.post('/forgot-password-number', async (req, res) => {
  try{
    const number = String(req.body.number || '').trim();
    const otp = String(req.body.otp.code || '').trim();
    if(!number && !otp || !number){
      return res.status(503).json({error: 'No data specified. This process failed'})
    }

    let returnedUser = await db.functions.tableGetRows("public.users", { phone_number: number }), thisUser = returnedUser.data[0];
    
    if(!thisUser){
      return res.status(503).json({error: 'No related account found. This process failed'});
    }

    let returnedOTP = await db.functions.tableGetRows("public.phone_otp", { user_id: thisUser.id, type: "password_reset" }), thisOtp = returnedOTP.data[0];
    let complete = false;
    const {newOTP, otpMessage, otpMessFrom, expiresAt} = generateOTP();
    if(!thisOtp){ // Sending
      await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);
      await db.functions.removeUser('public.phone_otp', { user_id: thisUser.id, type: 'password_reset' });
      await db.functions.tableCreateRow('phone_otp', { user_id: thisUser.id, otp: newOTP, type: "password_reset", expires_at: expiresAt });

      // console.log(`New OTP sent ${newOTP}`);
    }else{ // Receiving
      if(otp){ // User entered otp
        console.log(`User submitted OTP ${otp}`);
        
        if(new Date(thisOtp.expires_at).getTime() > new Date().getTime()){ // Otp has not expired
          // console.log("OTP has not expired");
          
          if(thisOtp.otp == otp){ // Otp is correct
            console.log("OTP is valid");
            // await db.functions.removeUser('public.phone_otp', { user_id: thisUser.id, otp, type: "password_reset" });

            complete = true;
          }else{ // Otp is not correct
            // console.log("OTP is NOT valid");
            return res.status(503).json({error: 'Your otp does not match or not found. Enter correct otp.'});
          }
        }else{ // Expired so resend
          // console.log(`OTP has expired. New one resent ${newOTP}`);
          
          await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp, type: "password_reset", expires_at: expiresAt });
          await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);
        }
      }else{ // User did not enter otp
        // console.log("User did not submit OTP");
        
        if(new Date(thisOtp.expires_at).getTime() < new Date().getTime() || req.body.otp.resend){ // Has the existing expired? Resend.
          // console.log(`Current OTP has expired. New one resent ${newOTP}`);
          
          await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp, type: "password_reset", expires_at: expiresAt });
          await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);
        }else{
          // console.log("Current OTP has NOT expired. Waiting for user submission");
          return res.status(503).json({error: 'You must enter the otp sent to you.'});
        }
      }
    }

    return res.status(200).json({Success: true , complete}); 
  }catch(error){
    console.error('Password-reset request failed:', error.message);
    return res.status(500).json({error: 'Unable to process your request. Please try again later.'});
  };
});

// Reset a password using a valid, single-use password-reset token.
router.post('/reset-password', async (req, res) => {
  // const { token, password } = req.body || {};
  const { params: {type, token}, password } = req.body || {};

  // if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) && type == 'email') {
  if (typeof token !== 'string' || !validateString(token, 1) && type == 'email') {
    return res.status(400).json({error: 'This password-reset link is invalid or expired.'});
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({error: 'Your password must be between 8 and 128 characters.'});
  }

  const tokenHash = (type == 'email') ? crypto.createHash('sha256').update(token).digest('hex') : token;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    let sqlQueryGet = `SELECT user_id
       FROM public.email_tokens
       WHERE token_hash = $1
         AND type = 'password_reset'
         AND expires_at > NOW()
       FOR UPDATE`;
    if(type == 'phone'){
      sqlQueryGet = `SELECT user_id
      FROM public.phone_otp
      WHERE otp = $1
      AND type = 'password_reset'
      AND expires_at > NOW()
      FOR UPDATE`;
    }

    /* const tokenResult = await client.query(
      `SELECT user_id
       FROM public.email_tokens
       WHERE token_hash = $1
         AND type = 'password_reset'
         AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    ); */
    const tokenResult = await client.query(sqlQueryGet, [tokenHash]);
    console.log('Fetching user ID for phone OTP', tokenResult.rows, tokenHash, type);

    if (tokenResult.rowCount === 0) {
      await client.query('ROLLBACK');

      // return res.status(400).json({error: 'This password-reset link is invalid or expired.'});
      return res.status(400).json({error: 'This password-reset '+(type == 'email' ? 'link' : 'otp')+' is invalid or expired.'});
    }

    const userId = tokenResult.rows[0].user_id;

    // Hash the new password before updating the account.
    const passwordHash = await bcrypt.hash(password, 12);

    const updateResult = await client.query(
      `UPDATE public.users
       SET password = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [passwordHash, userId]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');

      // return res.status(400).json({error: 'Unable to reset this password. Please request a new link.'});
      return res.status(400).json({error: 'Unable to reset this password. Please request a new '+(type == 'email' ? 'link' : 'otp')+'.'});
    }

    const sqlQueryDel = (type == 'email') ?
    `DELETE FROM public.email_tokens
       WHERE token_hash = $1
         AND type = 'password_reset'`
         :
         `DELETE FROM public.phone_otp
       WHERE otp = $1
         AND type = 'password_reset'`;

    // Consume the token so it cannot be reused.
    /* await client.query(
      `DELETE FROM public.email_tokens
       WHERE token_hash = $1
         AND type = 'password_reset'`,
      [tokenHash]
    ); */
    await client.query(sqlQueryDel, [tokenHash]);

    // Revoke existing refresh sessions in the same transaction.
    await client.query(
      `UPDATE public.refresh_tokens
       SET revoked = TRUE,
           revoked_at = COALESCE(revoked_at, NOW())
       WHERE user_id = $1
         AND revoked = FALSE`,
      [userId]
    );

    await client.query('COMMIT');

    return res.status(200).json({ok: true, message: 'Your password has been reset. You can now sign in.'});
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    console.error('Password-reset error:', error.message);

    return res.status(500).json({
      error: 'Unable to reset your password. Please try again.'
    }); 
  } finally {
    client.release();
  }
});

// router.get('/get-user', Middlewares.verifyJWTMiddleware, async (req, res) => {
router.get('/get-user', authMiddleware, async (req, res) => {
  try{
    // let returnedUser = await db.functions.tableGetRows("users", { id: req.user.user_id }), thisUser = returnedUser.data[0];
    let returnedUser = await db.functions.tableGetRows("users", { id: req.user.id }), thisUser = returnedUser.data[0];
    // console.log("Get User: ", thisUser);
    res.json({ Success: true, user: thisUser });
  }catch(error){
    console.error('Cannot get user: ', error)
    res.json( {Success: false, error} )
  }
});

// Verify Number
// router.post('/verify-number', Middlewares.emailTransporter, async (req, res) => {
// router.post('/verify-number', emailTransporter, async (req, res) => {
router.post('/verify-number', authMiddleware, async (req, res) => {
  try{
    // Verify Token
    const authHeader = req.headers.authorization;
    // let activeSession = getVerified(authHeader), status = {success: false, complete: false, otp: {code: '', sent: false, resent: false}, error: {state: false, message: ""}}, user_id = activeSession.user_id, returnedUser = await db.functions.tableGetRows("users", { id: user_id }), thisUser = returnedUser.data[0];
    let status = {success: false, complete: false, otp: {code: '', sent: false, resent: false}, error: {state: false, message: ""}}, user_id = req.user.id, returnedUser = await db.functions.tableGetRows("users", { id: user_id }), thisUser = returnedUser.data[0];

    // console.log(await db.functions.removeUser("users", { id: "6d6eafe9-1778-46f0-8a77-9c99309a99f7" }))
    // if(activeSession){
      // Process OTP
      // const otp = Math.floor(100000 + Math.random() * 900000).toString(), otpMessage = `Your OTP is ${otp}. It expires in 10 minutes.`, otpMessFrom = "DC Soft";
      const {newOTP, otpMessage, otpMessFrom, expiresAt} = generateOTP();
      
      if(thisUser){
        if(thisUser.phone_verified){
          status = {success: true, complete: true};
          await issueRefreshCookie(req, res, thisUser.id);
        }else{
          if(!thisUser.phone_number){
            thisUser = await db.functions.tableUpdateRow("users", {id: thisUser.id, phone_number: req.body.number });
          }
          
          // console.log(`Watch here: ${success}`, verified.user, `THIS USER: `, thisUser, req.body)
          let returnedOtp = await db.functions.tableGetRows("phone_otp", { user_id: `${thisUser.id}` }), thisOtp = returnedOtp.data[0];
          // console.log(`Watch here: ${status.success}`, `Otp: ${thisOtp.otp} == ${req.body.otp}`, `Date: ${new Date(thisOtp.expires_at)} and ${new Date()}`, verified.user)
          if(!thisOtp || req.body.otp.resend){
            if(req.body.otp.resend){
              await db.functions.removeUser('public.phone_otp', { otp: thisOtp.otp });
              await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp: newOTP, type: 'phone_verification', expires_at: expiresAt });
              // status = {...status, resent: true};
              status = {...status, otp: {...status.otp, resent: true}};
            }else{
              await db.functions.tableCreateRow('phone_otp', { user_id: thisUser.id, otp: newOTP, type: 'phone_verification', expires_at: expiresAt });
            }
            await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);

            status = {...status, otp: {...status.otp, sent: true}, success: true};
            // status.success = true;
          }else{ // Otp exists already OR receiving it
          //  if(thisOtp.otp === req.body.otp){
           if(thisOtp.otp === req.body.otp.code){
            // if(new Date(thisOtp.expires_at) > new Date()){
            if(new Date(thisOtp.expires_at).getTime() > new Date().getTime()){ // Has not expired yet
              await db.functions.tableUpdateRow("users", {id: thisUser.id, phone_verified: true });
              await db.functions.removeUser('public.phone_otp', { user_id: thisUser.id, otp: thisOtp.otp });
              await issueRefreshCookie(req, res, thisUser.id);
              
              welcomeUserSetup(thisUser, 1);

              status = {...status, complete: true};
              // status.complete = true;
            }else{ // Submitted or entered by user but expired so resend
              await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp: newOTP, type: 'phone_verification', expires_at: expiresAt });
              await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);

              // status = {...status, resent: true, error: {state: true, message: "OTP expired. A new OTP has been sent."}};
              status = {...status, otp: {...status.otp, sent: true, resent: true}, error: {state: true, message: "OTP expired. A new OTP has been sent."}};
            }
            
            status = {...status, success: true};
            // status.success = true;
          }else{ // No OTP submitted to us or entered by user. Check already sent OTP life-line.
            status = {...status, success: false, error: {state: false, message: "Invalid OTP. Please try again."}};
            if(new Date(thisOtp.expires_at).getTime() < new Date().getTime()){
              await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp: newOTP, type: 'phone_verification', expires_at: expiresAt });
              await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);
              
              // status = {...status, resent: true, error: {state: false, message: ""}};
              status = {...status, otp: {...status.otp, sent: true, resent: true}, error: {state: false, message: ""}};
            }
            // console.log(new Date(thisOtp.expires_at).getTime() > new Date().getTime())
            // status.success = false;
           }
          }
          // status = {...status, otp: {...status.otp, code: otp}};
        }
      }
    /* }else{
      status = {...status, error: {state: true, message: "Active session expired."}};
    } */

            console.log("DID WE GET HERE?????", status)
    res.json({ status, user: thisUser });
  }catch(err){
    console.error('verify-number error', err)
    res.json( {status: {success: false, complete: false, error: {state: true, message: `Verify number failed: ${err}`}}} )
  }
});

router.post('/remove-record', async (req, res) => {
  try{
    // console.log("Removing record: ", req.body)
    req.body.map(table => {
      // await db.functions.removeUser(table.tbname, table.clause);
      table.tbrecords.map(async record => await db.functions.removeUser(table.tbname, record[0]));
      // table.tbrecords.map(async record => console.log(record[0]));
    })
  
    res.json({ status: "Success" });
  }catch(error){
    console.error('Cannot remove record: ', error)
    res.json( {error} )
  }
});

router.post('/remove-user', async (req, res) => {
  try{
    removeUser(req.body.id);
    
    // let user = await db.functions.tableUpdateRow("users", {id: req.body.id, full_name: "Danald Consult" });
    // console.log(user);
  
    res.json({ status: "Success" });
  }catch(error){
    console.error('Cannot remove record: ', error)
    res.json( {error} )
  }
});

router.get('/remove-all-users', async (req, res) => {
  try{
    let users = await db.functions.tableGetRows('public.users');
    // removeUser(req.user.user_id);
    users.data.map(async user => await removeUser(user.id))
  
    res.json({ Success: true });
  }catch(error){
    console.error('Cannot remove record: ', error)
    res.json( {error} )
  }
});

// router.get('/remove-user', Middlewares.verifyJWTMiddleware, (req, res) => {
router.get('/remove-user', authMiddleware, (req, res) => {
  try{
    // removeUser(req.user.user_id);
    removeUser(req.user.id);
    // console.log(user);
  
    res.json({ Success: true });
  }catch(error){
    console.error('Cannot remove record: ', error)
    res.json( {error} )
  }
});

// Save Contacts
router.post('/save-contacts', authMiddleware, async (req, res) => {
  try{
    // console.log(req.body)
    // req.body.contacts.map(async (person) => await db.functions.tablecreateRow("phone_numbers", {user_id: req.body.user_id, phone_number: person[1], date_created: new Date(), full_name: person[0], email: person[2] ? person[2] : "" }))
    if(req.query.action == "create"){
      // req.body.map(async (person) => await db.functions.tableCreateRow("phone_numbers", {user_id: req.query.user_id, phone_number: person.phone_number, created_at: new Date(), full_name: person.full_name, email: person.email || "" }));
      req.body.map(async (number) => await db.functions.tableCreateRow("phone_numbers", {user_id: req.user.id, phone_number: number.phone_number, created_at: new Date(), full_name: number.full_name, email: number.email || "" }));
    }
    if(req.query.action == "update"){
      req.body.map(async (number) => await db.functions.tableUpdateRow("phone_numbers", {id: number.id, full_name: number.full_name, phone_number: number.phone_number, email: number.email }));
    }
    if(req.query.action == "remove"){
      req.body.map(async (number) => {
        // await db.functions.removeUser("pngroups_and_pn_association", { phone_number_id: person.id, user_id: req.query.user_id });
        await db.functions.removeUser("pngroups_and_pn_association", { phone_number_id: number.id, user_id: req.user.id });
        // await db.functions.removeUser("phone_numbers", { id: person.id, user_id: req.query.user_id });
        await db.functions.removeUser("phone_numbers", { id: number.id, user_id: req.user.id });
      })
    }
    // let phone_numbers = await db.functions.tableGetRows('phone_numbers', { user_id: req.query.user_id }, {orderBy: "id", desc: "ASC", page: 1, limit: 10});
    let phone_numbers = await db.functions.tableGetRows('phone_numbers', { user_id: req.user.id }, {orderBy: "id", desc: "ASC", page: 1, limit: 10});
    // console.log(phone_numbers)
  
    res.json({ Success: true, phone_numbers });
  }catch(error){
    res.json( {Success: false, error: 'Failed to save contacts,'+ error} );
  }
});

// Save Contacts
// router.post('/contact-grouping', Middlewares.verifyJWTMiddleware, async (req, res) => {
router.post('/contact-grouping', authMiddleware, async (req, res) => {
  try{
    if(req.query.action == "create"){
      // await db.functions.tableCreateRow("phone_number_groups", {user_id: req.query.user_id, group_name: req.body.name, group_description: req.body.description, created_at: new Date() });
      await db.functions.tableCreateRow("phone_number_groups", {user_id: req.user.id, group_name: req.body.name, group_description: req.body.description, created_at: new Date() });
    }
    if(req.query.action == "update"){
      await db.functions.tableUpdateRow("phone_number_groups", {id: req.query.id, group_name: req.body.name, group_description: req.body.description });
    }
    if(req.query.action == "remove"){
      await db.functions.removeUser("phone_number_groups", { id: req.query.id, user_id: req.user.id });
    }
    let phone_number_groups = await db.functions.tableGetRows('phone_number_groups', { user_id: req.user.id }, {orderBy: "id", desc: "ASC", page: 1, limit: 10});
    // console.log(phone_number_groups);

    res.json({ success: true, phone_number_groups });
  }catch(error){
    res.json( {success: false, error: 'Could not process group, '+ error} );
  }
});

router.post('/group-processor', authMiddleware, async (req, res) => {
  try{
    // let phoneNumGrpAssociations = await db.functions.tableGetRows("pngroups_and_pn_association", { user_id: req.query.user_id });
    let phoneNumGrpAssociations = await db.functions.tableGetRows("pngroups_and_pn_association", { user_id: req.user.id });
    req.body.contacts.map(async (each_1) => {
      if(req.query.action == "remove"){
        // await db.functions.removeUser("pngroups_and_pn_association", { group_id: req.body.group.id, phone_number_id: each_1.id, user_id: req.query.user_id });
        await db.functions.removeUser("pngroups_and_pn_association", { group_id: req.body.group.id, phone_number_id: each_1.id, user_id: req.user.id });
        if(phoneNumGrpAssociations.data.length > 0){
          let indexToRemove = phoneNumGrpAssociations.data.findIndex(each_2 => each_2.group_id == req.body.group.id && each_2.phone_number_id == each_1.id);
          indexToRemove >= 0 && phoneNumGrpAssociations.data.splice(indexToRemove, 1);
        }
      }
      if(req.query.action == "add"){
        if(!phoneNumGrpAssociations.data.some(each_2 => each_2.group_id == req.body.group.id && each_2.phone_number_id == each_1.id)){
          // phoneNumGrpAssociations.data.push(await db.functions.tableCreateRow("pngroups_and_pn_association", {group_id: req.body.group.id, phone_number_id: each_1.id, user_id: req.query.user_id }))
          phoneNumGrpAssociations.data.push(await db.functions.tableCreateRow("pngroups_and_pn_association", {group_id: req.body.group.id, phone_number_id: each_1.id, user_id: req.user.id }))
        }
      }
    });
        // console.log(phoneNumGrpAssociations);
    // phoneNumGrpAssociations = db.functions.tableGetRows("pngroups_and_pn_association", { user_id: req.query.user_id });
    phoneNumGrpAssociations = db.functions.tableGetRows("pngroups_and_pn_association", { user_id: req.user.id });

    res.json({Success: true, phoneNumGrpAssociations});
  }catch(error){
    res.json( {Success: false, error: 'Unfortunately, this process failed. '+ error} );
  }
});

// router.post('/sms-default', Middlewares.verifyJWTMiddleware, async (req, res) => {
router.post('/sms-default', authMiddleware, async (req, res) => {
  // console.log("Are we reaching here?", req.user);
  try{
    // let thisUser = await db.functions.tableGetRows("users", { id: req.user.user_id });
    let thisUser = await db.functions.tableGetRows("users", { id: req.user.id });
    thisUser = thisUser.data[0];
    if(req.query.action == "update"){
      // thisUser = await db.functions.tableUpdateRow("users", {id: req.user.user_id, sender: req.body.sender, message: req.body.message });
      thisUser = await db.functions.tableUpdateRow("users", {id: req.user.id, sender: req.body.sender, message: req.body.message });
    }

    // res.json({ Success: true, smsDefault: {sender: thisUser.sender, message: thisUser.message}});
    res.json({ Success: true, smsDefault: {sender: thisUser.sender, message: thisUser.message}});
  }catch(error){
    res.json( {error: 'Unfortunately, this process failed. '+ error} );
  }
});

// Refresh
// Refresh access token using the HttpOnly refresh cookie.
router.post('/refresh', async (req, res) => {
  try {
    const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];
    console.log('[MOBILE AUTH DIAGNOSTICS]', {
        origin: req.get('origin'),
        host: req.get('host'),
        userAgent: req.get('user-agent'),
        hasRefreshCookie: Boolean(cookieValue),
        cookieNames: Object.keys(req.cookies || {})
    });
    
    console.warn('[REFRESH REJECTED]', {
        reason: 'REFRESH_COOKIE_MISSING'
    });

    // console.log('[AUTH REFRESH DEBUG] Cookie value:', cookieValue);
    if (!cookieValue) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Refresh token missing'
      });
    }

    const separator = cookieValue.indexOf('.');

    console.warn('[REFRESH REJECTED]', {
        reason: 'INVALID REFRESH COOKIE FORMAT'
    });

    if (separator <= 0 || separator === cookieValue.length - 1) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Invalid refresh token format'
      });
    }

    const tokenId = cookieValue.slice(0, separator);
    const tokenPlain = cookieValue.slice(separator + 1);

    const row = await tokenStore.getRefreshRowByTokenId(tokenId);

    console.warn('[REFRESH REJECTED]', {
        reason: 'UNAVAILABLE REFRESH TOKEN RECORD'
    });

    if (!row) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    console.warn('[REFRESH REJECTED]', {
        reason: 'REFRESH_COOKIE_TOKEN_REVOKED'
    });

    if (row.revoked) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Refresh token has been revoked'
      });
    }

    console.warn('[REFRESH REJECTED]', {
        reason: 'REFRESH_COOKIE_HAS_EXPIRED'
    });

    if (new Date(row.expires_at) <= new Date()) {
      await tokenStore.revokeRefreshRowByTokenId(tokenId);
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Refresh token expired'
      });
    }

    const tokenMatches = await bcrypt.compare(
      tokenPlain,
      row.token_hash
    );

    console.log('[AUTH REFRESH DEBUG] Token hash comparison:', {
        tokenMatches
    });

    console.warn('[REFRESH REJECTED]', {
        reason: 'REFRESH_COOKIE_MISMATCH'
    });

    if (!tokenMatches) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // const users = await dbQuery(
    //   `SELECT id, full_name, email, role
    //    FROM public.users
    //    WHERE id = $1
    //    LIMIT 1`,
    //   [row.user_id]
    // );
    const userResult = await db.functions.tableGetRows(
        'public.users',
        { id: row.user_id },
        { limit: 1 }
    );

    const user = userResult?.data?.[0];

    console.warn('[REFRESH REJECTED]', {
        reason: 'USER NOT_FOUND'
    });

    if (!user) {
        await tokenStore.revokeRefreshRowByTokenId(tokenId);
        clearRefreshCookie(res);

        return res.status(401).json({
            error: 'User not found'
        });
    }

    const newTokenId = uuidv4();
    const newTokenPlain = generateRefreshToken(48);

    const expiresAt = new Date(
      Date.now() +
      (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) *
      24 * 60 * 60 * 1000
    );

    await tokenStore.rotateRefreshToken({
      oldTokenId: tokenId,
      userId: user.id,
      tokenPlain: newTokenPlain,
      tokenId: newTokenId,
      ip: req.ip || null,
      userAgent: req.get('User-Agent') || null,
      expiresAt
    });

    const accessToken = signAccessToken({
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    });

    setRefreshCookie(res, newTokenId, newTokenPlain);
    console.log('[AUTH REFRESH DEBUG] Refresh completed successfully.');
    // let accessToken = setRefreshToken(req, res);

    return res.json({
      Success: true,
      accessToken
    });
  } catch (error) {
    console.warn('[REFRESH REJECTED]', {
        reason: 'REFRESH_COOKIE_FAILED'
    });
    if (error.message === 'REFRESH_TOKEN_INVALID') {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Refresh token is no longer valid'
      });
    }

    console.error('refresh error:', error);

    return res.status(500).json({
      error: 'Unable to refresh session'
    });
  }
});

/* router.get('/refresh', Middlewares.verifyJWTMiddleware, async (req, res) => {
  try{
    // let phoneNumbers = await getPhoneNumbers(1, 10, req.user.user.user_id, "phone_numbers");
    // let phone_number_groups = await getPhoneNumbers(1, 10, req.user.user.user_id, "phone_number_groups");
    
    let user_id = req.user.user_id;
    const [
      thisUser,
      phone_numbers,
      phone_number_groups,
      phoneNumGrpAssociations
    ] = await Promise.all([
      db.functions.tableGetRows("users", { id: user_id }),
      getPhoneNumbers(1, 10, user_id, "phone_numbers"),
      getPhoneNumbers(1, 10, user_id, "phone_number_groups"),
      db.functions.tableGetRows("pngroups_and_pn_association", { user_id })
    ]);

    // const date1 = new Date(thisUser.data[0].unit_1_date);
    const date1 = new Date(thisUser.data[0].unit_1_created_at);
    const date2 = new Date('2026-07-15');
    // Subtracting dates returns the difference in milliseconds
    const diffInMs = Math.abs(date2 - date1);
    // Convert milliseconds to days: (1000ms * 60s * 60m * 24h)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if(diffInDays >= 31){
      await db.functions.tableUpdateRow("users", {id: user_id, unit_1: defaultUnit, unit_1_created_at: new Date()});
    }

    // console.log(req.user.user_id, req.user);
    res.json({Success: true, user: req.user, allData: {user_info: {unit_1: thisUser.data[0].unit_1, unit_2: thisUser.data[0].unit_2}, phone_numbers, phone_number_groups, phoneNumGrpAssociations}});
  }catch(error){
    res.json( {Success: false, error: 'Unfortunately, this process failed. '+ error} );
  }
}); */
// Load the authenticated user's profile and dashboard data.
// router.get('/reload-data', Middlewares.verifyJWTMiddleware, async (req, res) => {
router.get('/reload-data', authMiddleware, async (req, res) => {
  try {
    // const user_id = req.user.user_id;
    const user_id = req.user.id;

    let userResult = await db.functions.tableGetRows('users', { id: user_id });
    let thisUser = userResult?.data?.[0];

    if (!thisUser) {
      return res.status(404).json({
        Success: false,
        error: 'User not found'
      });
    }

    // Reset monthly SMS units after 31 days.
    const lastUnitDate = thisUser.unit_1_created_at ? new Date(thisUser.unit_1_created_at) : null;
    const now = new Date();

    if (!lastUnitDate || Number.isNaN(lastUnitDate.getTime()) || now.getTime()-lastUnitDate.getTime() >= 31*24*60*60*1000) {
      thisUser = await db.functions.tableUpdateRow('users', {id: user_id, unit_1: defaultUnit, unit_1_created_at: now});

      // Reload the user so the response contains updated values.
      userResult = await db.functions.tableGetRows(
        'users',
        { id: user_id }
      );

      thisUser = userResult?.data?.[0];

      if (!thisUser) {
        return res.status(404).json({
          Success: false,
          error: 'User not found after credit update'
        });
      }
    }

    const [
      phone_numbers,
      phone_number_groups,
      phoneNumGrpAssociations
    ] = await Promise.all([
      db.functions.tableGetRows('phone_numbers', { user_id }, {orderBy: "id", desc: "ASC", page: 1, limit: 10}),
      db.functions.tableGetRows('phone_number_groups', { user_id }, {orderBy: "id", desc: "ASC", page: 1, limit: 10}),
      db.functions.tableGetRows(
        'pngroups_and_pn_association',
        { user_id }
      )
    ]);

    return res.json({
      Success: true,
      user: req.user,
      allData: {
        user_info: {
          unit_1: thisUser.unit_1,
          unit_2: thisUser.unit_2
        },
        phone_numbers,
        phone_number_groups,
        phoneNumGrpAssociations
      }
    });

  } catch (error) {
    console.error('GET /auth/refresh error:', error);

    return res.status(500).json({
      Success: false,
      error: 'Unable to load user profile'
    });
  }
});

// router.post('/contact-us', Middlewares.emailTransporter, async (req, res) => {
router.post('/contact-us', authMiddleware, async (req, res) => {
  try {
    /* const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD
      }
    }); */
    // console.log(transporter);

    // await db.functions.tableCreateRow("contact_form", {user_id: req.query.user_id, name: req.body.name, subject: req.body.subject, message: req.body.message, created_at: new Date(), company: req.body.company});
    await db.functions.tableCreateRow("contact_form", {user_id: req.user.id, name: req.body.name, subject: req.body.subject, message: req.body.message, created_at: new Date(), company: req.body.company});
    // let user = await db.functions.tableGetRows("users", { id: req.query.user_id });
    let user = await db.functions.tableGetRows("users", { id: req.user.id });
    /* await req.transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: process.env.EMAIL_ADDRESS,
      subject: req.body.subject,
      html: `
          <h2>New Contact Form</h2>

          <p><b>Name:</b> ${req.body.name}</p>
          <p><b>Email:</b> ${req.body.email}</p>
          <p><b>Phone:</b> ${user.data[0].phone_number}</p>

          <p>${req.body.message}</p>
      `
    }); */
    /* await req.transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      replyTo: req.body.email,
      subject: "We've received your message",
      html: `
          <p>Hello ${req.body.name},</p>
          <p>Thank you for contacting DC Group.</p>
          <p>We've received your inquiry and one of our team members will respond shortly.</p>
          <p>

Regards,
DC Group</p>
      `
    }); */
    requestSendMail({
      from: null,
      to: req.body.email,
      // replyTo: req.body.email,
      subject: 'We\'ve received your message',
      text: null,
      html: `<p>Hello ${req.body.name},</p>
            <p>Thank you for contacting DC Group.</p>
            <p>We've received your message and one of our team members will respond shortly.</p>
            <p>

            Regards,
            DC Group</p>`
    });
    requestSendMail({
      from: null,
      to: process.env.EMAIL_ADDRESS,
      subject: req.body.subject,
      text: null,
      html: `h2>New Contact Form</h2>

            <p><b>Name:</b> ${req.body.name}</p>
            <p><b>Email:</b> ${req.body.email}</p>
            <p><b>Phone:</b> ${user.data[0].phone_number}</p>

            <p>${req.body.message}</p>`
    });

    res.json({Success: true});
  }catch(error){
    res.json( {Success: false, error: 'Unfortunately, this process failed. '+ error} );
  }
});

// Login
router.post('/login', express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing email or password'
      });
    }
    
    // Fetch the user using the actual database schema.
    /* const users = await dbQuery(
    `SELECT id, full_name, email, password, role, email_verified
      FROM public.users
      WHERE email = $1
      LIMIT 1`,
      [email]
    ); */
    const users = await db.functions.tableGetRows("public.users", { email });
    
    // const user = users[0];
    const user = users.data[0];
    
    if (!user || !user.password) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Preserve the existing email verification requirement.
    if (!user.email_verified && !user.phone_verified) {
      return res.status(403).json({error: 'You need to verify first.'});
    }

    // Verify the submitted password against the stored hash.
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Sign an access token using the claim structure
    // expected by the existing authentication middleware.
    const accessToken = signAccessToken({
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    });

    // Generate one refresh token and one unique token ID.
    const tokenPlain = generateRefreshToken(48);
    const tokenId = uuidv4();

    const expiresAt = new Date(
      Date.now() +
      (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) *
      24 * 60 * 60 * 1000
    );

    // Store the hashed refresh token exactly once.
    await tokenStore.storeRefreshTokenRow({
      user_id: user.id,
      tokenPlain,
      tokenId,
      ip: req.ip || null,
      userAgent: req.get('User-Agent') || null,
      expiresAt
    });

    // Set the HttpOnly cookie in tokenId.tokenPlain format.
    console.log("LOGIN: ", [tokenId, tokenPlain]);
    setRefreshCookie(res, tokenId, tokenPlain);

    // Return the access token and public user information.
    return res.json({
      Success: true,
      accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('login error:', error);

    return res.status(500).json({
      error: 'Server error'
    });
  }
});

// Logout
// Logout and revoke the current refresh token.
router.post('/logout', async (req, res) => {
  try {
    const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];

    if (cookieValue) {
      const separator = cookieValue.indexOf('.');

      if (separator > 0) {
        const tokenId = cookieValue.slice(0, separator);

        await tokenStore.revokeRefreshRowByTokenId(tokenId);
      }
    }

    clearRefreshCookie(res);

    return res.json({ ok: true });
  } catch (error) {
    console.error('logout error:', error);

    clearRefreshCookie(res);

    return res.status(500).json({
      error: 'Unable to complete logout'
    });
  }
});



// -----------------------------------------
// &&&&&&&&&&&  FUNCTIONS  &&&&&&&&&&&&&&&&&
// -----------------------------------------

function validateString(string, type=0){
  let result = false;

  if(type == 0){ // Email
    result = (!string || string.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string)) ? false : true;
  }

  if(type == 1){ // Token
    result = (typeof string !== 'string' || !/^[a-f0-9]{64}$/i.test(string)) ? false : true;
  }

  return result;
}

function generateRefreshToken(number) {
  return crypto.randomBytes(number).toString('hex');
}

function signAccessToken(user) {
  // const payload = { sub: user.id, email: user.email, name: user.name || null }
  // return jwt.sign(user, Middlewares.environmentV.secret, { expiresIn: Middlewares.environmentV.duration })
  return jwt.sign(user, environmentV.secret, { expiresIn: environmentV.duration })
}

async function welcomeUserSetup(user, mode=0){
  let message = `Welcome to DC SMS Distribution Portal ${user.full_name}, Your sign up process was successfull.. Enjoy your experience!`;
  if(mode == 1){
    await preSMS_Send({ to: [user.phone_number], message }, "DC Soft");
  }else{
    // To the new user
    requestSendMail({
      from: null,
      to: user.email,
      subject: 'WELCOME TO DC SMS!!',
      text: message
    });
  }
  
  /* await req.transporter.sendMail({
    from: process.env.EMAIL_ADDRESS,
    to: process.env.EMAIL_ADDRESS,
    subject: "NEW USER!!",
    html: `
        <h2>A New User Joined.</h2>

        <p><b>Name:</b> ${thisUser.full_name}</p>
        <p><b>Email:</b> ${thisUser.email}</p>
        <p><b>Phone:</b> ${thisUser.phone_number}</p>

        <p>A new user with the above details joined DC SMS Distribution Portal on this date ${new Date()}.</p>
    `
  }); */
  // To developer
  requestSendMail({
    from: null,
    to: process.env.EMAIL_ADDRESS,
    subject: 'NEW USER!!',
    text: null,
    html: `<h2>A New User Joined.</h2>
        <p><b>Name:</b> ${user.full_name}</p>
        <p><b>Email:</b> ${user.email}</p>
        <p><b>Phone:</b> ${user.phone_number}</p>
        <p>A new user with the above details joined DC SMS Distribution Portal on this date ${new Date()}.</p>` 
  });
}

// Set page refresh cookie
function setRefreshCookie(res, tokenId, tokenPlain) {
  const days = Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30, cookieValue = tokenStore.makeCookieValue(tokenId, tokenPlain);

  res.cookie(
    REFRESH_COOKIE_NAME,
    cookieValue,
    {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: days * 24 * 60 * 60 * 1000,
      path: '/'
    }
  );
}

async function removeUser(id){
  // const Query = `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  const queryTables = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  const getDBTables = await db.functions.dbQuery(queryTables, []);

  getDBTables.map(async table => {
    if(table.table_name != "users" && table.table_name != 'schema_migrations' && table.table_name != 'pgmigrations'){
      let queryColumns = `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table.table_name}' ORDER BY ordinal_position`
      let getDBTableColumns = await db.functions.dbQuery(queryColumns, []);
      
      let thisTable = null;
      getDBTableColumns.map(column => {
        // console.log(`COLUMN: ${column.column_name}`);
        // if(column.column_name == 'user_id') console.log(`COLUMN: ${column.column_name}`);
        // if(column.column_name == 'user_id') filteredDBTables.push(table.table_name);
        if(column.column_name == 'user_id') thisTable = table.table_name;
      });
      if(thisTable){
        console.log(`TABLE: ${table.table_name}`);
        await db.functions.removeUser(thisTable, {user_id: id});
      }
    }
  });
  await db.functions.removeUser('users', {id: id})
}

async function setRefreshToken(req, res){
  const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];

  // console.log('[AUTH REFRESH DEBUG] Cookie value:', cookieValue);
  if (!cookieValue) {
    clearRefreshCookie(res);

    return res.status(401).json({error: 'Refresh token missing'});
  }

  const separator = cookieValue.indexOf('.');

  if (separator <= 0 || separator === cookieValue.length - 1) {
    clearRefreshCookie(res);

    return res.status(401).json({error: 'Invalid refresh token format'});
  }

  const tokenId = cookieValue.slice(0, separator);
  const tokenPlain = cookieValue.slice(separator + 1);

  const row = await tokenStore.getRefreshRowByTokenId(tokenId);
  /* console.log('[AUTH REFRESH DEBUG] Token lookup:', {
    tokenRecordFound: Boolean(row),
    tokenRevoked: row?.revoked ?? null,
    tokenExpired: row?.expires_at
        ? new Date(row.expires_at) <= new Date()
        : null
}); */

  if (!row) {
    clearRefreshCookie(res);

    return res.status(401).json({error: 'Invalid refresh token'});
  }

  if (row.revoked) {
    clearRefreshCookie(res);

    return res.status(401).json({error: 'Refresh token has been revoked'});
  }

  if (new Date(row.expires_at) <= new Date()) {
    await tokenStore.revokeRefreshRowByTokenId(tokenId);
    clearRefreshCookie(res);

    return res.status(401).json({error: 'Refresh token expired'});
  }

  const tokenMatches = await bcrypt.compare(tokenPlain, row.token_hash);
  console.log('[AUTH REFRESH DEBUG] Token hash comparison:', {
      tokenMatches
  });

  if (!tokenMatches) {
    clearRefreshCookie(res);

    return res.status(401).json({error: 'Invalid refresh token'});
  }

  /* const users = await dbQuery(
    `SELECT id, full_name, email, role
      FROM public.users
      WHERE id = $1
      LIMIT 1`,
    [row.user_id]
  ); */
  const userResult = await db.functions.tableGetRows('public.users', { id: row.user_id }, { limit: 1 });
  const user = userResult?.data?.[0];

  if (!user) {
      await tokenStore.revokeRefreshRowByTokenId(tokenId);
      clearRefreshCookie(res);

      return res.status(401).json({error: 'User not found'});
  }

  const newTokenId = uuidv4();
  const newTokenPlain = generateRefreshToken(48);

  const expiresAt = new Date(Date.now() + (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) * 24 * 60 * 60 * 1000);

  await tokenStore.rotateRefreshToken({
    oldTokenId: tokenId,
    userId: user.id,
    tokenPlain: newTokenPlain,
    tokenId: newTokenId,
    ip: req.ip || null,
    userAgent: req.get('User-Agent') || null,
    expiresAt
  });

  const accessToken = signAccessToken({
    user_id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role
  });

  setRefreshCookie(res, newTokenId, newTokenPlain);

  return accessToken;
}

module.exports = router