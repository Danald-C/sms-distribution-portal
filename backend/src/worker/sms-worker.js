// SMS API to providers 
const { Worker } = require('bullmq');
const { connectionRedis } = require('../lib/redisClient');
const axios = require('axios');

const processWorker = async () => {
  console.log('Worker ready to process SMS jobs...');
  try{
    new Worker('sms-queue', async job => {
      const { sender, to, message } = job.data;
      console.log('To:', to + '; Message: ' + message);
      await sendSmsViaProvider(sender, to, message);
    }, { connection: connectionRedis });
  } catch (error) {
    console.error('Error starting SMS worker:', error);
  }
}

async function sendSmsViaProvider(sender, to, message) {
  console.log(`📨 Sending SMS to ${to}: ${message}`);
    const data = {
      // "sender": sender,
      sender,
      // "message": "Welcome to Arkesel SMS API v2. Please enjoy the experience.",
      // "message": `${message}`,
      message,
      // "recipients": [`${to}`,"233502653700"],
      "recipients": to,
      // When sending SMS to Nigerian recipients, specify the use_case field
      // "use_case" = "transactional"
    };

    const config = {
      method: 'post',
      url: process.env.SMS_PROVIDER_API_URL,
      headers: {
          'api-key': process.env.SMS_PROVIDER_API_KEY
      },
      data
    };

    axios(config).then(function (response) {
    console.log(JSON.stringify(response.data));
    }).catch(function (error) {
    console.log(error);
    });
  // integrate real provider here (Twilio, Hubtel, etc.)
}

module.exports = { processWorker };