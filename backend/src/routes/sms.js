const express = require('express')
const multer = require('multer')
const upload = multer()
const router = express.Router()

const csvParse = require('csv-parse');
const { Queue } = require('bullmq');


const smsQueue = new Queue('sms-send', { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } });
// const smsQueue = new Queue('sms-send', { connection: { host: process.env.REDIS_HOST || 'localhost', port: 4000 } });

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

module.exports = router