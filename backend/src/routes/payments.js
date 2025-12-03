const express = require('express')
const router = express.Router()

router.post('/pay', async (req,res)=>{
  // Validate request, compute units, enqueue job to send SMS
  // Use Redis/BullMQ worker for sending
  res.json({ ok:true })
})

module.exports = router