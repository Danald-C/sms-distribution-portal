const express = require('express')
const multer = require('multer')
const upload = multer()
const router = express.Router()

const csvParse = require('csv-parse');

const db = require("../db.js"); // your DB connection
const Middlewares = require('../middleware/authMiddleware');
const { connectionRedis } = require('../lib/redisClient');
const { requestSendMail } = require('../lib/email.js');
// const { processWorker } = require('../worker/sms-worker');

const { Queue } = require('bullmq');

// const IORedis = require('ioredis');

// const { sendSmsViaProvider} = require('../worker/sms-worker');
// console.log('Redis connecting to:', connectionRedis.options.host + ':' + connectionRedis.options.port);

// const smsQueue = new Queue('sms-send', { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } });
const smsQueue = new Queue('sms-queue', { connection: connectionRedis });

async function enqueueSms({sender, to, message }) {
  await smsQueue.add('send-sms', { sender, to, message }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  });
}


//*******  */
 // SEND SMS

// SCHEDULE SMS
/* const axios = require('axios');
const data = {"sender": "Hello world",
              "message": "Welcome to Arkesel SMS API v2. Please enjoy the experience.",
              "recipients": ["233553995047","233544919953"],
              "scheduled_date": "2021-03-17 07:00 AM",
              // When sending SMS to Nigerian recipients, specify the use_case field
              // "use_case" = "transactional"
              };

const config = {
  method: 'post',
  url: 'https://sms.arkesel.com/api/v2/sms/send',
  headers: {
    'api-key': 'cE9QRUkdjsjdfjkdsj9kdiieieififiw=',
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});

// SEND SMS WITH DELIVERY WEBHOOK
const axios = require('axios');
const data = {"sender": "Hello world",
              "message": "Welcome to Arkesel SMS API v2. Please enjoy the experience.",
              "recipients": ["233553995047","233544919953"],
              "callback_url": "https://google.com",
              // When sending SMS to Nigerian recipients, specify the use_case field
              // "use_case" = "transactional"
            };

const config = {
  method: 'post',
  url: 'https://sms.arkesel.com/api/v2/sms/send',
  headers: {
    'api-key': 'cE9QRUkdjsjdfjkdsj9kdiieieififiw=',
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
}); */
//*******  */

// router.post('/send', Middlewares.verifyJWTMiddleware, async (req, res) => {
router.post('/send', Middlewares.emailTransporter, Middlewares.verifyJWTMiddleware, async (req, res) => {
  try{
    /* const { sender, to, message } = req.body;
    await enqueueSms({ sender, to, message });
    await processWorker(); */ // start the worker to process SMS jobs
    
    let thisUser = await db.functions.tableGetRows("users", { id: req.user.user_id }), unit_1 = Number(thisUser.data[0].unit_1), unit_2 = Number(thisUser.data[0].unit_2), totalReceipients = 0;
    // req.body.payload.map(each => Math.max(1, Math.ceil(each.message.length / 160))).reduce((acc, val) => acc + val, 0);

    req.body.payload.map(each => totalReceipients += each.to.length);
    // First deplete the SMS units from the first unit (unit_1), then from the second unit (unit_2) if needed.
    // if(unit_1 != 0){
    if(unit_1 > 0){
      if(totalReceipients >= unit_1){
        totalReceipients -= unit_1; // Subtract available units from total recipients
        unit_1 = 0; // Reset available units to 0 since all have been used
      }else{
        unit_1 -= totalReceipients; // Subtract total recipients from available units
        totalReceipients = 0 // Reset total recipients to 0 since all have been sent
      }
      await db.functions.tableUpdateRow("users", {id: req.user.user_id, unit_1 });
    }

    // if(totalReceipients > 0 && unit_2 != 0){
    if(totalReceipients > 0 && unit_2 > 0){
      // Do SMS Unit deduction from Other...
      if(unit_2 >= totalReceipients){
        unit_2 -= totalReceipients;
        totalReceipients = 0;
      }else{
        totalReceipients -= unit_2;
        unit_2 = 0;
      }
      await db.functions.tableUpdateRow("users", {id: req.user.user_id, unit_2 });
    }

  let filteredPayload = [], unsentPayloads = [];
  if(totalReceipients > 0){
    req.body.payload.map(each => {
      if(totalReceipients >= each.to.length){ // To is an array of recipients, so we check the length of the array
        totalReceipients -= each.to.length;
        filteredPayload.push(each);
      }else{ // totalReceipients will always be smaller than each.to.length here, so we slice the array to only include the remaining recipients
        if(totalReceipients > 0){
          // each.to = (each.to.length > totalReceipients) ? each.to.slice(0, each.to.length-totalReceipients) : each.to; // Slice the array to only include the remaining recipients
          each.to = each.to.slice(0, totalReceipients); // Slice the array to only include the remaining recipients
          filteredPayload.push(each);
          // unsentPayloads.push({ ...each, to: each.to.slice(each.to.length-totalReceipients) }); // All remaining recipients are unsent
          unsentPayloads.push({ ...each, to: each.to.slice(totalReceipients) }); // All remaining recipients are unsent
          
          totalReceipients = 0;
        }else{
          unsentPayloads.push(each); // All remaining recipients are unsent
        }
      }
    }); // Truncate the message list
  }else{
    filteredPayload = req.body.payload;
  }
      // console.log('Did you send the request? ', filteredPayload, totalReceipients);

    // preSMS_Send(req.body);
    // req.body.payload.map(each => {
    /* filteredPayload.map(async each => {
      await preSMS_Send(each, req.body.sender);
    }); */
    await Promise.all(
      filteredPayload.map(each =>
        preSMS_Send(each, req.body.sender)
      )
    );

    if(filteredPayload.length > 0){
      // Write History here...
      await db.functions.tableCreateRow('activity_history', { user_id: thisUser.data[0].id, type: "SMS", description: `${filteredPayload.length} sms was sent.`, created_at: new Date() });
      /* await req.transporter.sendMail({
        from: process.env.EMAIL_ADDRESS,
        to: process.env.EMAIL_ADDRESS,
        subject: "SMS SENT!!",
        html: `
            <h2>SMS was sent.</h2>

            <p><b>Name:</b> ${thisUser.data[0].full_name}</p>
            <p><b>Email:</b> ${thisUser.data[0].email}</p>
            <p><b>Phone:</b> ${thisUser.data[0].phone_number}</p>

            <p>The user with the above details sent <b>${filteredPayload.length}</b> sms on this date ${new Date()}.</p>
        `
      }); */
      requestSendMail({
        from: null,
        to: null,
        subject: 'SMS SENT!!',
        text: ``,
        html: `<h2>SMS was sent.</h2>

            <p><b>Name:</b> ${thisUser.data[0].full_name}</p>
            <p><b>Email:</b> ${thisUser.data[0].email}</p>
            <p><b>Phone:</b> ${thisUser.data[0].phone_number}</p>

            <p>The user with the above details sent <b>${filteredPayload.length}</b> sms on this date ${new Date()}.</p>` 
      });
    }
    
    // res.json({ Status: 'queued', totalRecipients: req.body.payload.reduce((acc, each) => acc + each.to.length, 0), unsentPayloads });
    res.json({ Success: true, Status: 'queued', unsentPayloads });
  }catch(err){
    console.error('Error in /send route:', err);
    return res.status(500).json({ Success: false, error: 'Server error' });
  }
});

async function preSMS_Send(body, sender) {
  const { to, message } = body;

  await enqueueSms({
    sender,
    to,
    message
  });
}
/* async function preSMS_Send(body, sender) {
  const { to, message } = body;
  await enqueueSms({ sender, to, message });
  await processWorker(); // start the worker to process SMS jobs
} */

/* async function sendPostRequest() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
} */

/* router.post('/send', upload.single('recipients'), async (req,res)=>{
  // Validate request, compute units, enqueue job to send SMS
  // Use Redis/BullMQ worker for sending
  res.json({ ok:true })
}) */


/* router.post('/send', upload.single('recipients'), async (req, res) => {
  try {
  const message = req.body.message || '';
  const unitsPerMsg = Math.max(1, Math.ceil(message.length / 160));
  const getFile = req.file;


  if (!getFile) return res.status(400).json({ error: 'No recipients file uploaded' });


  // parse CSV buffer
  const recipients = [];
  const fileContents = getFile.buffer.toString('utf8'); // Data/Contacts in file
  csvParse(fileContents, { columns: false, trim: true }, (err, rows) => {
  if (err) return res.status(400).json({ error: 'CSV parse error' });
  rows.forEach(r => {
  const phone = Array.isArray(r) ? r[0] : r;
  if (phone) recipients.push(String(phone).replace(/\D/g, ''));
  });
  // push job (batch)
  smsQueue.add('send-batch', { message, recipients, unitsPerMsg }, { attempts: 3 });
  return res.json({ queued: true, totalRecipients: recipients.length, totalUnits: recipients.length * unitsPerMsg });
  });
  } catch (err) {
  console.error(err);
  res.status(500).json({ error: 'in'});
  }
}); */

module.exports = { router, preSMS_Send }