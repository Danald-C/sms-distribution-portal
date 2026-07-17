const express = require('express')
const multer = require('multer')
const upload = multer()
const router = express.Router()

const csvParse = require('csv-parse');

const db = require("../db.js"); // your DB connection
const Middlewares = require('../middleware/authMiddleware');
const { connectionRedis } = require('../lib/redisClient');
const { processWorker } = require('../worker/sms-worker');

const { Queue } = require('bullmq');

// const IORedis = require('ioredis');

// const { sendSmsViaProvider} = require('../worker/sms-worker');
console.log('Redis connecting to:', connectionRedis.options.host + ':' + connectionRedis.options.port);

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

router.post('/send', Middlewares.verifyJWTMiddleware, async (req, res) => {
  try{
    /* const { sender, to, message } = req.body;
    await enqueueSms({ sender, to, message });
    await processWorker(); */ // start the worker to process SMS jobs
    
    let thisUser = await db.functions.tableGetRows("users", { id: req.user.user.user_id }), unit_1 = Number(thisUser.data[0].unit_1), unit_2 = Number(thisUser.data[0].unit_2), remainder = 0;
    // req.body.payload.map(each => Math.max(1, Math.ceil(each.message.length / 160))).reduce((acc, val) => acc + val, 0);

    req.body.payload.map(each => remainder += each.to.length);
    if(unit_1 != 0){
      if(remainder >= unit_1){
        remainder -= unit_1;
        unit_1 = 0;
      }else{
        unit_1 -= remainder;
        remainder = 0
      }
      await db.functions.tableUpdateRow("users", {id: req.user.user.user_id, unit_1 });
    }

    if(remainder > 0 && unit_2 != 0){
      // Do SMS Unit deduction from Other...
      if(unit_2 >= remainder){
        unit_2 -= remainder;
        remainder = 0;
      }else{
        remainder -= unit_2;
        unit_2 = 0;
      }
      await db.functions.tableUpdateRow("users", {id: req.user.user.user_id, unit_2 });
    }

  if(remainder > 0){
    // req.body.payload = req.body.payload.slice(-remainder, req.body.payload.length); // Truncate the message list
    // let totalRecipients = req.body.payload.reduce((acc, each) => acc + each.to.length, 0);
    // let excessRecipients = totalRecipients - remainder;
    let filteredPayload = [], unsentPayloads = [];
    req.body.payload.map(each => {
      // each.to = each.to.slice(-remainder, each.to.length);
      if(remainder >= each.to.length){
        remainder -= each.to.length;
        filteredPayload.push(each);
      }else{
        if(remainder > 0){
          each.to = each.to.slice(0, each.to.length-remainder);
          filteredPayload.push(each);
          unsentPayloads.push({ ...each, to: each.to.slice(each.to.length-remainder) }); // All remaining recipients are unsent
          remainder = 0;
        }else{
          unsentPayloads.push(each); // All remaining recipients are unsent
        }
      }
    }); // Truncate the message list
  }

    // preSMS_Send(req.body);
    // req.body.payload.map(each => {
    filteredPayload.map(each => {
      preSMS_Send(each, req.body.sender);
    });

    if(req.body.payload.length > 0){
      // Write History here...
    }
    
    // res.json({ Status: 'queued', totalRecipients: req.body.payload.reduce((acc, each) => acc + each.to.length, 0), unsentPayloads });
    res.json({ Status: 'queued', unsentPayloads });
  }catch(err){
    console.error('Error in /send route:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// async function preSMS_Send(body) {
async function preSMS_Send(body, sender) {
  // const { sender, to, message } = body;
  const { to, message } = body;
  await enqueueSms({ sender, to, message });
  await processWorker(); // start the worker to process SMS jobs
}

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