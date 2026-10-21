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

const Middlewares = require('../middleware/authMiddleware');
const oAuth = require('../api/auth/oAuthController')
const { preSMS_Send } = require('./sms')

const { redis, REUSE_WINDOW_SEC } = require('../lib/redisClient');
// const { sendReuseAlert } = require('../lib/email');

const tokenStore = require('../lib/tokenStore');

const {
  REFRESH_TOKEN_EXPIRES_DAYS = '30',
  REFRESH_COOKIE_NAME = 'sms_refresh',
  NODE_ENV
} = process.env;

const defaultUnit = 30;

async function dbQuery(query, params = []) {
  const result = await db.pool.query(query, params);
  return result.rows;
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function setRefreshCookie(res, tokenId, tokenPlain) {
  const days = Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30;

  res.cookie(
    REFRESH_COOKIE_NAME,
    tokenStore.makeCookieValue(tokenId, tokenPlain),
    {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: days * 24 * 60 * 60 * 1000,
      path: '/'
    }
  );
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

  const tokenPlain = generateRefreshToken();
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



function signAccessToken(user) {
  // const payload = { sub: user.id, email: user.email, name: user.name || null }
  return jwt.sign(user, Middlewares.environmentV.secret, { expiresIn: Middlewares.environmentV.duration })
}


/* function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
} */

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

/* router.get('/protected', authMiddleware, (req, res)=> {
  res.json({ message: 'ok', user: req.user })
}) */

/* router.post('/google-oauth', async (req, res)=> {
  try{
    let oAuth_res = await oAuth(req, res); // Process Google Credential
    
    let authentication = await authenticateUser({ full_name: oAuth_res.user.name, email: oAuth_res.user.email, google_id: oAuth_res.user.google_id, profile_picture: oAuth_res.user.picture });
    // let returnedData = {success: oAuth_res.success, token: jwtToken, user, newUser };
    let returnedData = {Success: oAuth_res.success, token: authentication.jwtToken, user: authentication.user, allData: authentication.allData, newUser: authentication.newUser };
    console.log(returnedData);
    // res.json({ oAuth_res })
    res.json(returnedData)
  }catch(error){
    console.log('oAuth_err', error)
    res.json( {error} )
  }
}); */
router.post('/google-oauth', async (req, res) => {
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
      google_id: oAuth_res.user.google_id,
      profile_picture: oAuth_res.user.picture
    });

    // Issue a refresh cookie for the authenticated user.
    await issueRefreshCookie(
      req,
      res,
      authentication.user.user_id
    );

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

router.post('/usersign-oauth', async (req, res)=> {
  try{
    console.log(req.body)
    // let authentication = await authenticateUser({ full_name: req.body.name, email: req.body.email, google_id: 0, profile_picture: "none" });
    let authentication = await authenticateUser({ full_name: req.body.name, email: req.body.email, google_id: 'gid_0', profile_picture: "none" });
    // let returnedData = {success: oAuth_res.success, token: jwtToken, user, newUser };
    let returnedData = {Success: true, token: authentication.jwtToken, user: authentication.user, allData: authentication.allData, newUser: authentication.newUser };
    // res.json({ oAuth_res })
    res.json(returnedData)
  }catch(error){
    console.log('oAuth_err', error)
    res.json( {Success: false, Error: `User sign authentication failed: ${error}`} );
  }
});

async function authenticateUser(user) {
    let userData = await db.functions.tableGetRows("users", { email: user.email }), thisUser = userData.data[0], newUser = false;
    if(!thisUser){
      let getAll = await db.functions.tableGetRows("users", {});
      thisUser = await db.functions.tableCreateRow("users", {...user, google_id: `gid_${getAll.data.length}`, unit_1: defaultUnit, unit_1_created_at: new Date(), unit_2: 0});

      newUser = true;
    }else{
      if(!thisUser.phone_verified){
        if(user.full_name) thisUser = await db.functions.tableUpdateRow("users", {id: thisUser.id, full_name: user.full_name });
        newUser = true;
      }
    }
    const [
      phone_numbers,
      phone_number_groups,
      phoneNumGrpAssociations
    ] = await Promise.all([
      getPhoneNumbers(1, 10, thisUser.id, "phone_numbers"),
      getPhoneNumbers(1, 10, thisUser.id, "phone_number_groups"),
      db.functions.tableGetRows("pngroups_and_pn_association", { user_id: thisUser.id })
    ]);
    let otherData = {user_info: {unit_1: thisUser.unit_1, unit_2: thisUser.unit_2}, phone_numbers, phone_number_groups, phoneNumGrpAssociations}
    // let user = {user_id: thisUser.id, ...user};
    // let jwtToken = signAccessToken({user});
    let thisName = user.full_name || thisUser.full_name, signThis = {...user, user_id: thisUser.id, full_name: thisName };
      // console.log(signThis, thisName)
    let jwtToken = signAccessToken(signThis);

    return {jwtToken, user: signThis, newUser, allData: otherData};
}

// Register
// Register a new email/password account.
router.post('/register', async (req, res) => {
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

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        error: 'Please provide a valid email address.'
      });
    }

    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 128
    ) {
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

    // Hash the password and create a one-time verification token.
    const passwordHash = await bcrypt.hash(password, 12);
    const rawToken = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query('BEGIN');

    // Use the actual database columns.
    // google_id is required by the existing schema, even for local accounts.
    const userResult = await client.query(
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
    );

    const user = userResult.rows[0];

    // Store only the hash, never the raw verification token.
    await client.query(
      `INSERT INTO public.email_tokens
         (token_hash, user_id, type, expires_at)
       VALUES ($1, $2, 'verification', $3)`,
      [tokenHash, user.id, expiresAt]
    );

    const frontendUrl = (
      process.env.FRONTEND_URL ||
      'https://www.dcsmsportal.com'
    ).replace(/\/+$/, '');

    const verificationUrl =
      `${frontendUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

    // Reuse the email credentials already configured in your application.
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Send the verification email before committing the new account.
    // If email delivery fails, the transaction is rolled back.
    await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: user.email,
      subject: 'Verify your DC SMS Portal email address',
      text:
        `Hello ${user.full_name},\n\n` +
        `Please verify your email address by opening this link:\n` +
        `${verificationUrl}\n\n` +
        `This link expires in 24 hours.\n\n` +
        `If you did not request this account, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2>Verify your email address</h2>
          <p>Hello,</p>
          <p>
            Thank you for registering with DC SMS Distribution Portal.
            Please verify your email address to activate your account.
          </p>
          <p>
            <a
              href="${verificationUrl}"
              style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px"
            >
              Verify email address
            </a>
          </p>
          <p>This link expires in 24 hours.</p>
          <p>
            If you did not request this account, you can ignore this email.
          </p>
        </div>
      `
    });

    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      message: 'Registration successful. Please check your email to verify your account.'
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

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        error: 'The verification link is invalid or expired.'
      });
    }

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

    await client.query(
      `UPDATE public.users
       SET email_verified = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // Remove the token so it cannot be reused.
    await client.query(
      `DELETE FROM public.email_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: 'Your email has been verified. You can now sign in.'
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    console.error('Email verification error:', error.message);

    return res.status(500).json({
      error: 'Email verification failed. Please try again.'
    });
  } finally {
    client.release();
  }
});

router.get('/get-user', Middlewares.verifyJWTMiddleware, async (req, res) => {
  try{
    let returnedUser = await db.functions.tableGetRows("users", { id: req.user.user_id }), thisUser = returnedUser.data[0];
    // console.log("Get User: ", thisUser);
    res.json({ Success: true, user: thisUser });
  }catch(error){
    console.error('Cannot get user: ', error)
    res.json( {Success: false, error} )
  }
});

// Verify Number
router.post('/verify-number', Middlewares.emailTransporter, async (req, res) => {
  try{
    // Verify Token
    const authHeader = req.headers.authorization;
    let verified = Middlewares.getVerified(authHeader), status = {success: false, complete: false, resent: false, error: {state: false, message: ""}}, user_id = verified.user_id, returnedUser = await db.functions.tableGetRows("users", { id: user_id }), thisUser = returnedUser.data[0];

    // console.log(await db.functions.removeUser("users", { id: "6d6eafe9-1778-46f0-8a77-9c99309a99f7" }))
    if(verified){
      // Process OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString(), otpMessage = `Your OTP is ${otp}. It expires in 10 minutes.`, otpMessFrom = "DC Soft";
      
      if(thisUser){
        if(thisUser.phone_verified){
          status = {success: true, complete: true};
        }else{
          let expiresAt = new Date(Date.now() + 10*60*1000) // 10 minutes from now
          // Date.now() + 5 * 60 * 1000
          
          if(!thisUser.phone_number){
            thisUser = await db.functions.tableUpdateRow("users", {id: thisUser.id, phone_number: req.body.number });
          }
          
          // console.log(`Watch here: ${success}`, verified.user, `THIS USER: `, thisUser, req.body)
          let returnedOtp = await db.functions.tableGetRows("phone_otp", { user_id: `${thisUser.id}` }), thisOtp = returnedOtp.data[0];
          // console.log(`Watch here: ${status.success}`, `Otp: ${thisOtp.otp} == ${req.body.otp}`, `Date: ${new Date(thisOtp.expires_at)} and ${new Date()}`, verified.user)
          if(!thisOtp || req.body.otp.resend){
            if(req.body.otp.resend){
              await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp, expires_at: expiresAt });
              status = {...status, resent: true};
            }else{
              await db.functions.tableCreateRow('phone_otp', { user_id: thisUser.id, otp, expires_at: expiresAt });
            }
            await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);

            status = {...status, success: true};
            // status.success = true;
          }else{ // Otp exists already OR receiving it
          //  if(thisOtp.otp === req.body.otp){
           if(thisOtp.otp === req.body.otp.code){
            // if(new Date(thisOtp.expires_at) > new Date()){
            if(new Date(thisOtp.expires_at).getTime() > new Date().getTime()){
              await db.functions.tableUpdateRow("users", {id: thisUser.id, phone_verified: true });

              await preSMS_Send({ to: [thisUser.phone_number], message: `Welcome to DC SMS Distribution Portal, Your sign up process was successfull.. Enjoy your experience!` }, "DC Soft");
              await req.transporter.sendMail({
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
              });
            
              status = {...status, complete: true};
              // status.complete = true;
            }else{
              await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp, expires_at: expiresAt });
              await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);

              status = {...status, resent: true, error: {state: true, message: "OTP expired. A new OTP has been sent."}};
            }
            
            status = {...status, success: true};
            // status.success = true;
          }else{
            status = {...status, success: false, error: {state: false, message: "Invalid OTP. Please try again."}};
            if(new Date(thisOtp.expires_at).getTime() < new Date().getTime()){
              await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp, expires_at: expiresAt });
              await preSMS_Send({ to: [thisUser.phone_number], message: otpMessage }, otpMessFrom);
              
              status = {...status, resent: true, error: {state: false, message: ""}};
            }
            console.log("DID WE GET HERE?????", status, thisOtp, req.body.otp)
            console.log(new Date(thisOtp.expires_at).getTime() > new Date().getTime())
            // status.success = false;
           }
          }
        }
      }
    }else{
      status = {...status, error: {state: true, message: "User not verified."}};
    }

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

// Save Contacts
router.post('/save-contacts', async (req, res) => {
  try{
    // console.log(req.body)
    // req.body.contacts.map(async (person) => await db.functions.tablecreateRow("phone_numbers", {user_id: req.body.user_id, phone_number: person[1], date_created: new Date(), full_name: person[0], email: person[2] ? person[2] : "" }))
    if(req.query.action == "create"){
      req.body.map(async (person) => await db.functions.tableCreateRow("phone_numbers", {user_id: req.query.user_id, phone_number: person.phone_number, created_at: new Date(), full_name: person.full_name, email: person.email || "" }));
    }
    if(req.query.action == "update"){
      req.body.map(async (person) => await db.functions.tableUpdateRow("phone_numbers", {id: person.id, full_name: person.full_name, phone_number: person.phone_number, email: person.email }));
    }
    if(req.query.action == "remove"){
      req.body.map(async (person) => {
        await db.functions.removeUser("pngroups_and_pn_association", { phone_number_id: person.id, user_id: req.query.user_id });
        await db.functions.removeUser("phone_numbers", { id: person.id, user_id: req.query.user_id });
      })
    }
    let phone_numbers = await getPhoneNumbers(1, 10, req.query.user_id, "phone_numbers");
    // console.log(phone_numbers)
  
    res.json({ Success: true, phone_numbers });
  }catch(error){
    res.json( {Success: false, error: 'Failed to save contacts,'+ error} );
  }
});

// Save Contacts
router.post('/contact-grouping', async (req, res) => {
  try{
    // let newRecord = await db.functions.tablecreateRow("phone_number_groups", {user_id: req.body.user_id, group_name: req.body.name, group_description: req.body.description, date_created: new Date() })
    if(req.query.action == "create"){
      // await db.functions.tableCreateRow("phone_number_groups", {user_id: req.query.user_id, group_name: req.body.name, group_description: req.body.description, date_created: new Date() });
      await db.functions.tableCreateRow("phone_number_groups", {user_id: req.query.user_id, group_name: req.body.name, group_description: req.body.description, created_at: new Date() });
    }
    if(req.query.action == "update"){
      await db.functions.tableUpdateRow("phone_number_groups", {id: req.query.id, group_name: req.body.name, group_description: req.body.description });
    }
    if(req.query.action == "remove"){
      await db.functions.removeUser("phone_number_groups", { id: req.query.id, user_id: req.query.user_id });
    }
    // let phone_number_groups = await getPhoneNumbers(1, 10, newRecord.user_id, "phone_number_groups");
    let phone_number_groups = await getPhoneNumbers(1, 10, req.query.user_id, "phone_number_groups");
      console.log(phone_number_groups);
  
    res.json({ success: true, phone_number_groups });
  }catch(error){
    res.json( {success: false, error: 'Could not create group,'+ error} );
  }
});

router.post('/group-processor', async (req, res) => {
  try{
    let phoneNumGrpAssociations = await db.functions.tableGetRows("pngroups_and_pn_association", { user_id: req.query.user_id });
    req.body.contacts.map(async (each_1) => {
      if(req.query.action == "remove"){
        await db.functions.removeUser("pngroups_and_pn_association", { group_id: req.body.group.id, phone_number_id: each_1.id, user_id: req.query.user_id });
        if(phoneNumGrpAssociations.data.length > 0){
          let indexToRemove = phoneNumGrpAssociations.data.findIndex(each_2 => each_2.group_id == req.body.group.id && each_2.phone_number_id == each_1.id);
          indexToRemove >= 0 && phoneNumGrpAssociations.data.splice(indexToRemove, 1);
        }
      }
      if(req.query.action == "add"){
        if(!phoneNumGrpAssociations.data.some(each_2 => each_2.group_id == req.body.group.id && each_2.phone_number_id == each_1.id)){
          phoneNumGrpAssociations.data.push(await db.functions.tableCreateRow("pngroups_and_pn_association", {group_id: req.body.group.id, phone_number_id: each_1.id, user_id: req.query.user_id }))
        }
      }
    });
        // console.log(phoneNumGrpAssociations);
    // phoneNumGrpAssociations = db.functions.tableGetRows("pngroups_and_pn_association", { user_id: req.query.user_id });

    res.json({Success: true, phoneNumGrpAssociations});
  }catch(error){
    res.json( {Success: false, error: 'Unfortunately, this process failed. '+ error} );
  }
});

router.post('/sms-default', Middlewares.verifyJWTMiddleware, async (req, res) => {
  // console.log("Are we reaching here?", req.user);
  try{
    let thisUser = await db.functions.tableGetRows("users", { id: req.user.user_id });
    thisUser = thisUser.data[0];
    if(req.query.action == "update"){
      thisUser = await db.functions.tableUpdateRow("users", {id: req.user.user_id, sender: req.body.sender, message: req.body.message });
    }

    res.json({ Success: true, smsDefault: {sender: thisUser.sender, message: thisUser.message}});
  }catch(error){
    res.json( {error: 'Unfortunately, this process failed. '+ error} );
  }
});

router.post('/fetch-contacts', async (req, res) => {
  try{
    console.log(req.query.user_id);
    // getPhoneNumbers(req.query.page, req.query.limit, req.query.user_id)

    // res.json({ status: "Success" });
  }catch(error){
    res.json( {error: 'Unfortunately, this process failed. '+ error} );
  }
});

async function getPhoneNumbers(page=1, limit=10, user_id, table){
  try{
    let results = await db.functions.tableGetRows(table, { user_id }, {orderBy: "id", desc: "ASC", page, limit});
    // let result = await db.functions.getUsers(page, limit);
    // console.log(results)

    return results;
  }catch(error){
    res.json( {error: 'Unfortunately, this process failed. '+ error} );
  }
}

// Refresh
// Refresh access token using the HttpOnly refresh cookie.
router.post('/refresh', async (req, res) => {
  try {
    const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!cookieValue) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Refresh token missing'
      });
    }

    const separator = cookieValue.indexOf('.');

    if (separator <= 0 || separator === cookieValue.length - 1) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Invalid refresh token format'
      });
    }

    const tokenId = cookieValue.slice(0, separator);
    const tokenPlain = cookieValue.slice(separator + 1);

    const row = await tokenStore.getRefreshRowByTokenId(tokenId);

    if (!row) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    if (row.revoked) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Refresh token has been revoked'
      });
    }

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

    if (!tokenMatches) {
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    const users = await dbQuery(
      `SELECT id, full_name, email, role
       FROM public.users
       WHERE id = $1
       LIMIT 1`,
      [row.user_id]
    );

    const user = users[0];

    if (!user) {
      await tokenStore.revokeRefreshRowByTokenId(tokenId);
      clearRefreshCookie(res);

      return res.status(401).json({
        error: 'User not found'
      });
    }

    const newTokenId = uuidv4();
    const newTokenPlain = generateRefreshToken();

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

    return res.json({
      Success: true,
      accessToken
    });
  } catch (error) {
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
router.get('/refresh', Middlewares.verifyJWTMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    let userResult = await db.functions.tableGetRows(
      'users',
      { id: user_id }
    );

    let thisUser = userResult?.data?.[0];

    if (!thisUser) {
      return res.status(404).json({
        Success: false,
        error: 'User not found'
      });
    }

    // Reset monthly SMS units after 31 days.
    const lastUnitDate = thisUser.unit_1_created_at
      ? new Date(thisUser.unit_1_created_at)
      : null;

    const now = new Date();

    if (
      !lastUnitDate ||
      Number.isNaN(lastUnitDate.getTime()) ||
      now.getTime() - lastUnitDate.getTime() >= 31 * 24 * 60 * 60 * 1000
    ) {
      await db.functions.tableUpdateRow('users', {
        id: user_id,
        unit_1: defaultUnit,
        unit_1_created_at: now
      });

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
      getPhoneNumbers(1, 10, user_id, 'phone_numbers'),
      getPhoneNumbers(1, 10, user_id, 'phone_number_groups'),
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

router.post('/contact-us', Middlewares.emailTransporter, async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD
      }
    });
    // console.log(transporter);

    await db.functions.tableCreateRow("contact_form", {user_id: req.query.user_id, name: req.body.name, subject: req.body.subject, message: req.body.message, created_at: new Date(), company: req.body.company});
    let user = await db.functions.tableGetRows("users", { id: req.query.user_id });
    await req.transporter.sendMail({
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
    });
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

    res.json({Success: true});
  }catch(error){
    res.json( {Success: false, error: 'Unfortunately, this process failed. '+ error} );
  }
});

// Login
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
    const users = await dbQuery(
      `SELECT id, full_name, email, password, role, email_verified
       FROM public.users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    const user = users[0];

    if (!user || !user.password) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Preserve the existing email verification requirement.
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Verify email first'
      });
    }

    // Verify the submitted password against the stored hash.
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

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
    const tokenPlain = generateRefreshToken();
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

module.exports = router