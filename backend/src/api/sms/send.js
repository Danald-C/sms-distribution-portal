const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Queue } = require('bullmq');
const pool = require('./db'); // postgres pool

const router = express.Router();
const upload = multer();
const smsQueue = new Queue('sms-send', { connection: { host: 'localhost', port: 6379 } });

router.post('/send', upload.single('recipients'), async (req, res) => {
  const userId = req.user.id; // assume auth middleware
  const message = req.body.message || '';
  const unitsPerMsg = Math.ceil(message.length / 160) || 1;

  let recipients = [];
  if (req.file) {
    // parse csv buffer
    const rows = [];
    // parse logic here — push phone numbers to rows
    // recipients = rows
  } else {
    return res.status(400).json({ error: 'No recipients provided' });
  }

  const totalUnits = recipients.length * unitsPerMsg;

  // check user balance/allowance
  const { rows: acctRows } = await pool.query('SELECT balance FROM accounts WHERE id=$1', [userId]);
  const balance = acctRows[0].balance || 0;
  const estimatedCost = totalUnits * 0.02; // example 0.02 USD per unit
  if (balance < estimatedCost) return res.status(402).json({ error: 'Insufficient balance' });

  // subtract balance (optimistic) and record usage record
  await pool.query('BEGIN');
  await pool.query('UPDATE accounts SET balance = balance - $1 WHERE id=$2', [estimatedCost, userId]);
  const usageRes = await pool.query('INSERT INTO usage_records(user_id, units, message) VALUES($1,$2,$3) RETURNING id', [userId, totalUnits, message]);

  // enqueue each recipient (or batch)
  await smsQueue.add('send-batch', { userId, message, recipients }, { attempts: 3 });

  await pool.query('COMMIT');
  res.json({ queued: true, totalUnits });
});

// Worker (sms-worker.js): consumes queue and calls SMS provider API (e.g., Twilio, Infobip, Africa's APIs)
// For West Africa, you may integrate local providers (Africa's Talking, MTN APIs, 3rd-party aggregators). Use provider that supports local origination.