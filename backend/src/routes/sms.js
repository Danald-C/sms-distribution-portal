const express = require('express')
const multer = require('multer')
const upload = multer()
const router = express.Router()

const csvParse = require('csv-parse');
const { Queue } = require('bullmq');

// const { redis } = require('../lib/redisClient');

// const IORedis = require('ioredis');

// const smsQueue = new Queue('sms-send', { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } });
/* const smsQueue = new Queue('sms-queue', { redis });

async function enqueueSms({ to, message }) {
  await smsQueue.add('send-sms', { to, message }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  });
} */


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

router.post('/api/sms-send', async (req, res) => {
  const { to, message } = req.body;
  await enqueueSms({ to, message });
  res.json({ status: 'queued' });
});

router.post('/send', upload.single('recipients'), async (req,res)=>{
  // Validate request, compute units, enqueue job to send SMS
  // Use Redis/BullMQ worker for sending
  res.json({ ok:true })
})


router.post('/send', upload.single('recipients'), async (req, res) => {
  try {
  const message = req.body.message || '';
  const unitsPerMsg = Math.max(1, Math.ceil(message.length / 160));


  if (!req.file) return res.status(400).json({ error: 'No recipients file uploaded' });


  // parse CSV buffer
  const recipients = [];
  const str = req.file.buffer.toString('utf8');
  csvParse(str, { columns: false, trim: true }, (err, rows) => {
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
});

module.exports = {router}