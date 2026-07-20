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



function signAccessToken(user) {
  // const payload = { sub: user.id, email: user.email, name: user.name || null }
  return jwt.sign(user, Middlewares.environmentV.secret, { expiresIn: Middlewares.environmentV.duration })
}


/* function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
} */

/* function setRefreshCookie(res, tokenPlain) {
  const days = Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30
  const maxAge = days * 24 * 60 * 60 * 1000
  res.cookie(REFRESH_COOKIE_NAME, tokenPlain, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge,
    path: '/'
  })
} */
function setRefreshCookie(res, tokenId, tokenPlain) {
  const days = Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30;
  const maxAge = days * 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_COOKIE_NAME, `${tokenId}.${tokenPlain}`, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge,
    path: '/'
  });
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

/* router.get('/protected', authMiddleware, (req, res)=> {
  res.json({ message: 'ok', user: req.user })
}) */

router.post('/google-oauth', async (req, res)=> {
  try{
    let oAuth_res = await oAuth(req, res); // Process Google Credential
    
    /* let userEmail = oAuth_res.user.email;
    let userData = await db.functions.tableGetRows("users", { email: userEmail }), thisUser = userData.data[0], newUser = false;
    // console.log(thisUser)
    if(!thisUser){
      thisUser = await db.functions.tableCreateRow("users", { name: oAuth_res.user.name, email: userEmail, google_id: oAuth_res.user.google_id, profile_picture: oAuth_res.user.picture })

      newUser = true;
    }else{
      if(!thisUser.phone_verified) newUser = true;
    }
    
    let user = {user_id: thisUser.id, ...oAuth_res.user}
    let jwtToken = signAccessToken({user}) */
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
});

router.post('/usersign-oauth', async (req, res)=> {
  try{
    // console.log(req.body)
    let authentication = await authenticateUser({ full_name: req.body.name, email: req.body.email, google_id: 0, profile_picture: "none" });
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
      thisUser = await db.functions.tableCreateRow("users", user);

      newUser = true;
    }else{
      if(!thisUser.phone_verified) newUser = true;
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
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const userRes = await db.pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,email', [name, email, hash]);
  const user = userRes.rows[0];
  // create email verification token
  const token = crypto.randomBytes(32).toString('hex');
  await db.pool.query('INSERT INTO email_tokens(token,user_id,type,expires_at) VALUES($1,$2,$3,$4)', [token, user.id, 'verification', new Date(Date.now()+1000*60*60*24)]);
  // send verification email with link: https://app/verify?token=...
  res.json({ ok: true });
});

// Verify email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  const t = await db.pool.query('SELECT user_id FROM email_tokens WHERE token=$1 AND type=$2 AND expires_at>now()', [token, 'verification']);
  if (t.rowCount === 0) return res.status(400).json({ error: 'Invalid token' });
  await db.pool.query('UPDATE users SET email_verified=true WHERE id=$1', [t.rows[0].user_id]);
  await db.pool.query('DELETE FROM email_tokens WHERE token=$1', [token]);
  res.json({ ok: true });
});

// Verify Number
router.post('/verify-number', Middlewares.emailTransporter, async (req, res) => {
  try{
    // Verify Token
    const authHeader = req.headers.authorization;
    let verified = Middlewares.getVerified(authHeader), status = {success: false, complete: false}, user_id = verified.user_id;

    // console.log(await db.functions.removeUser("users", { id: "6d6eafe9-1778-46f0-8a77-9c99309a99f7" }))
    if(verified){
      // Process OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      let returnedUser = await db.functions.tableGetRows("users", { id: user_id }), thisUser = returnedUser.data[0];
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
          if(!thisOtp){
            await db.functions.tableCreateRow('phone_otp', { user_id: thisUser.id, otp, expires_at: expiresAt });
            await preSMS_Send({ to: [thisUser.phone_number], message: `Your OTP is ${otp}. It expires in 10 minutes.` }, "DC Soft");

            status.success = true;
          }else{ // Otp exists already OR receiving it
           if(thisOtp.otp === req.body.otp){
            if(new Date(thisOtp.expires_at) > new Date()){
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
            
              status.complete = true;
            }else{
              await db.functions.tableUpdateRow("phone_otp", {user_id: thisUser.id, otp, expires_at: expiresAt });
              await preSMS_Send({ to: [thisUser.phone_number], message: `Your OTP is ${otp}. It expires in 10 minutes.` }, "DC Soft");
            }
            
            status.success = true;
           }else{
    // console.log(thisOtp)
            status.success = false;
           }
          }
        }
      }
    }

    res.json({ status });
  }catch(err){
    console.error('verify-number error', err)
    res.json( {status: {Success: false}, Error: `verify-number error: ${err}`} )
  }
});

router.post('/remove-record', async (req, res) => {
  try{
    req.body.map(async (each) => {
      await db.functions.removeUser(each.table, each.clause);
      // console.log(await db.functions.removeUser("users", { id: "6d6eafe9-1778-46f0-8a77-9c99309a99f7" }))
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
      req.body.map(async (person) => await db.functions.tableCreateRow("phone_numbers", {user_id: req.query.user_id, phone_number: person.phone_number, date_created: new Date(), full_name: person.full_name, email: person.email || "" }));
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
      await db.functions.tableCreateRow("phone_number_groups", {user_id: req.query.user_id, group_name: req.body.name, group_description: req.body.description, date_created: new Date() });
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
  try{
    let thisUser = await db.functions.tableGetRows("users", { id: req.user.user.user_id });
    thisUser = thisUser.data[0];
    if(req.query.action == "update"){
      thisUser = await db.functions.tableUpdateRow("users", {id: req.user.user.user_id, sender: req.body.sender, message: req.body.message });
    }
      console.log(req.user.user, req.body, thisUser);

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
    let results = await db.functions.tableGetRows(table, { user_id }, {orderBy: "id", desc: "DESC", page, limit});
    // let result = await db.functions.getUsers(page, limit);
    // console.log(results)

    return results;
  }catch(error){
    res.json( {error: 'Unfortunately, this process failed. '+ error} );
  }
}

// Refresh
/* router.post('/refresh', express.json(), async (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) return res.status(401).end();
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    const t = await db.pool.query('SELECT user_id FROM refresh_tokens WHERE token=$1 AND expires_at>now()', [token]);
    if (t.rowCount===0) return res.status(401).end();
    const user = await db.pool.query('SELECT id,name,email,role FROM users WHERE id=$1', [payload.sub]);
    const accessToken = signAccess(user.rows[0]);
    res.json({ accessToken, user: user.rows[0] });
  } catch (e) { return res.status(401).end(); }
});

// REFRESH TOKEN ENDPOINT
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    // const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    // if (!refreshToken) return res.status(401).end();

    // 1. Check if refresh token exists in DB
    const [rows] = await db.execute(
      "SELECT * FROM user_tokens WHERE refresh_token = ? LIMIT 1",
      [refreshToken]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokenRecord = rows[0];

    // 2. Verify refresh token signature
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err) => {
      if (err) return res.status(401).json({ message: "Expired refresh token" });
    });

    // 3. Generate a new access token
    const newAccessToken = jwt.sign({ userId: tokenRecord.user_id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post('/refresh', express.json(), async (req, res) => {
  try {
    const cookieToken = req.cookies && req.cookies[REFRESH_COOKIE_NAME]
    const bodyToken = req.body && req.body.refreshToken
    const tokenPlain = cookieToken || bodyToken

    if (!tokenPlain) return res.status(400).json({ error: 'No refresh token provided' })

    // We need to find which user this token belongs to.
    // Strategy: scan recent refresh_tokens rows and compare hashes for every user.
    // Optimization: if you store a token identifier in the cookie (e.g. token id), use that.
    // For simplicity: query most recent tokens and compare.
    // We'll fetch tokens from DB where not revoked and not expired.
    const candidateRows = await dbQuery(
      `SELECT id, user_id, token_hash, revoked, expires_at FROM refresh_tokens
       WHERE revoked = false
       ORDER BY created_at DESC
       LIMIT 1000`
    )

    let found = null
    for (const r of candidateRows) {
      if (await bcrypt.compare(tokenPlain, r.token_hash)) {
        found = r
        break
      }
    }

    if (!found) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token' })
    }

    // check expiry
    if (found.expires_at && new Date(found.expires_at) < new Date()) {
      // revoke as safety
      await revokeRefreshTokenById(found.id)
      return res.status(401).json({ error: 'Refresh token expired' })
    }

    // At this point, we have a valid refresh token row
    // Load user
    const users = await dbQuery('SELECT * FROM users WHERE id = $1 LIMIT 1', [found.user_id])
    const user = users[0]
    if (!user) {
      await revokeRefreshTokenById(found.id)
      return res.status(401).json({ error: 'User not found' })
    }

    // ROTATE: generate new refresh token, store it, mark old as revoked and set replaced_by
    const newRefreshPlain = generateRefreshToken()
    const expiresAt = new Date(Date.now() + (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) * 24 * 60 * 60 * 1000).toISOString()

    const newRow = await dbQuery(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, created_at, expires_at, revoked, replaced_by)
       VALUES ($1,$2,$3,$4,now(),$5,false,$6) RETURNING id`,
      [user.id, await bcrypt.hash(newRefreshPlain, 10), req.ip || null, req.get('User-Agent') || null, expiresAt, found.id]
    )

    // revoke the old
    await dbQuery('UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE id = $1', [found.id])

    // issue new access token
    const accessToken = signAccessToken(user)

    // set cookie with new refresh token
    setRefreshCookie(res, newRefreshPlain)

    res.json({ accessToken })
  } catch (err) {
    console.error('refresh error', err)
    res.status(500).json({ error: 'Server error' })
  }
}) */
/* -------- refresh with reuse detection -------- */
/* router.post('/refresh', express.json(), async (req, res) => {
  try {
    const cookie = req.cookies && req.cookies[REFRESH_COOKIE_NAME];
    const bodyToken = req.body && req.body.refreshToken;
    const raw = cookie || bodyToken;
    if (!raw) return res.status(400).json({ error: 'No refresh token provided' });

    const idx = raw.indexOf('.');
    if (idx === -1) return res.status(400).json({ error: 'Malformed token' });
    const tokenId = raw.slice(0, idx);
    const tokenPlain = raw.slice(idx + 1);

    const row = await tokenStore.getRefreshRowByTokenId(tokenId);
    if (!row) return res.status(401).json({ error: 'Invalid refresh token' });

    if (row.revoked) {
      // token id exists but is revoked — suspicious reuse attempt
      // increment reuse counter in Redis and trigger alert if threshold exceeded
      const reuseKey = `reuse:${tokenId}`;
      const count = await redis.incr(reuseKey);
      await redis.expire(reuseKey, REUSE_WINDOW_SEC);

      // if repeated reuse (e.g. >3) escalate
      if (count >= 2) {
        // revoke all tokens for user and log incident
        await tokenStore.revokeAllTokensForUser(row.user_id);
        await dbQuery('INSERT INTO auth_incidents (user_id, incident_type, detail) VALUES ($1,$2,$3)', [
          row.user_id,
          'refresh_token_reuse_revoked',
          JSON.stringify({ tokenId, ip: req.ip, userAgent: req.get('User-Agent'), reason: 'reused_revoked_token' })
        ]);

        // notify admin
        try {
          await sendReuseAlert({
            userId: row.user_id,
            ip: req.ip,
            device: req.get('User-Agent'),
            tokenId,
            note: `Revoked all sessions after ${count} reuse attempts`
          });
        } catch (e) {
          console.error('sendReuseAlert failed', e);
        }

        return res.status(401).json({ error: 'Refresh token reuse detected. All sessions revoked.' });
      }

      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await tokenStore.revokeRefreshRowByTokenId(tokenId);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // verify hash match
    const match = await bcrypt.compare(tokenPlain, row.token_hash);
    if (!match) {
      // tokenId exists but tokenPlain doesn't match -> reuse attempt
      // action: revoke all tokens for user, log incident, send email
      await tokenStore.revokeAllTokensForUser(row.user_id);
      await dbQuery('INSERT INTO auth_incidents (user_id, incident_type, detail) VALUES ($1,$2,$3)', [
        row.user_id,
        'refresh_token_reuse_detected',
        JSON.stringify({ tokenId, ip: req.ip, userAgent: req.get('User-Agent') })
      ]);

      try {
        await sendReuseAlert({
          userId: row.user_id,
          ip: req.ip,
          device: req.get('User-Agent'),
          tokenId,
          note: 'Token id seen with mismatched token value (possible replay). All sessions revoked.'
        });
      } catch (e) {
        console.error('sendReuseAlert failed', e);
      }

      return res.status(401).json({ error: 'Refresh token reuse detected. All sessions revoked.' });
    }

    // If we reach here, token is valid. ROTATE: create new token pair and revoke old.
    const newTokenPlain = crypto.randomBytes(48).toString('hex');
    const newTokenId = uuidv4();
    const expiresAt = new Date(Date.now() + (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) * 24*60*60*1000).toISOString();

    await tokenStore.storeRefreshTokenRow({ user_id: row.user_id, tokenPlain: newTokenPlain, tokenId: newTokenId, ip: req.ip || null, userAgent: req.get('User-Agent') || null, expiresAt, replacedBy: tokenId });

    await tokenStore.revokeRefreshRowByTokenId(tokenId);

    // issue new access token
    const users = await dbQuery('SELECT * FROM users WHERE id = $1 LIMIT 1', [row.user_id]);
    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const accessToken = signAccessToken(user);

    // set new cookie
    setRefreshCookie(res, newTokenId, newTokenPlain);
    res.json({ accessToken });
  } catch (err) {
    console.error('refresh error', err);
    res.status(500).json({ error: 'Server error' });
  }
}); */

router.get('/refresh', Middlewares.verifyJWTMiddleware, async (req, res) => {
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

    const date1 = new Date(thisUser.data[0].unit_1_date);
    const date2 = new Date('2026-07-15');
    // Subtracting dates returns the difference in milliseconds
    const diffInMs = Math.abs(date2 - date1);
    // Convert milliseconds to days: (1000ms * 60s * 60m * 24h)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if(diffInDays >= 31){
      await db.functions.tableUpdateRow("users", {id: user_id, unit_1: 30, unit_1_date: new Date()});
    }

    // console.log(req.user.user_id, req.user);
    res.json({Success: true, user: req.user, allData: {user_info: {unit_1: thisUser.data[0].unit_1, unit_2: thisUser.data[0].unit_2}, phone_numbers, phone_number_groups, phoneNumGrpAssociations}});
  }catch(error){
    res.json( {Success: false, error: 'Unfortunately, this process failed. '+ error} );
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
router.post('/login', express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
    // const r = await db.pool.query('SELECT id,name,email,password_hash,role,email_verified FROM users WHERE email=$1', [email]);
    const users = await dbQuery('SELECT * FROM users WHERE email = $1 LIMIT 1', [email])
    if (users.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const u = users.rows[0];
    // const user = users[0]
    if (!u || !u.password_hash) return res.status(401).json({ error: 'Invalid credentials' })
    if (!u.email_verified) return res.status(403).json({ error: 'Verify email first' });
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const accessToken = signAccessToken(user)
    /* const accessToken = signAccess(u);
    const refreshToken = signRefresh(u);
    // store refresh token
    await db.pool.query('INSERT INTO refresh_tokens(token,user_id,expires_at) VALUES($1,$2,$3)', [refreshToken, u.id, new Date(Date.now()+30*24*3600*1000)]); */
    // generate refresh token, store hashed
    const refreshTokenPlain = generateRefreshToken()
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + (Number(REFRESH_TOKEN_EXPIRES_DAYS) || 30) * 24 * 60 * 60 * 1000).toISOString()
    await tokenStore.storeRefreshTokenRow({ user_id: u.id, refreshTokenPlain, tokenId, ip: req.ip || null, userAgent: req.get('User-Agent') || null, expiresAt });
    await storeRefreshToken({
      user_id: u.id,
      tokenPlain: refreshTokenPlain,
      ip: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.get('User-Agent') || null,
      expiresAt
    })

    // set cookie and respond
    setRefreshCookie(res, refreshTokenPlain)
    // set HttpOnly cookie with refresh token
    // res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 30*24*3600*1000 });
    res.json({ accessToken, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  }catch(err){
    console.error('login error', err)
    res.status(500).json({ error: 'Server error' })
  }
});

// Logout
/* router.post('/logout', async (req, res) => {
  const token = req.cookies.refresh_token;
  if (token) await db.pool.query('DELETE FROM refresh_tokens WHERE token=$1', [token]);
  res.clearCookie('refresh_token');
  res.json({ ok: true });
}); */
router.post('/logout', async (req, res) => {
  try {
    const cookieToken = req.cookies && req.cookies[REFRESH_COOKIE_NAME]
    const bodyToken = req.body && req.body.refreshToken
    const tokenPlain = cookieToken || bodyToken
    if (!tokenPlain) {
      const idx = tokenPlain.indexOf('.');
      // still clear cookie
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
      if (idx !== -1) {
        const tokenId = tokenPlain.slice(0, idx);
        await tokenStore.revokeRefreshRowByTokenId(tokenId);
      }
      return res.json({ ok: true })
    }

    // Find and revoke
    const candidateRows = await dbQuery(
      `SELECT id, user_id, token_hash FROM refresh_tokens ORDER BY created_at DESC LIMIT 1000`
    )
    for (const r of candidateRows) {
      if (await bcrypt.compare(tokenPlain, r.token_hash)) {
        await revokeRefreshTokenById(r.id)
        break
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
    res.json({ ok: true })
  } catch (err) {
    console.error('logout error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// export default router;

module.exports = router