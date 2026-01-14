// SMS API to providers 
const { Worker } = require('bullmq');
// const { redis } = require('../lib/redisClient');
const axios = require('axios');

/* new Worker('sms-queue', async job => {
  const { to, message } = job.data;
  await sendSmsViaProvider(to, message);
}, { redis }); */

async function sendSmsViaProvider(to, message) {
  console.log(`📨 Sending SMS to ${to}: ${message}`);
    const data = {"sender": "DC Group",
                "message": "Welcome to Arkesel SMS API v2. Please enjoy the experience.",
                "recipients": ["233553995047","233544919953"],
                // When sending SMS to Nigerian recipients, specify the use_case field
                // "use_case" = "transactional"
                };

    const config = {
    method: 'post',
    url: 'https://sms.arkesel.com/api/v2/sms/send',
    headers: {
        'api-key': 'cE9QRUkdjsjdfjkdsj9kdiieieififiw='
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
  // integrate real provider here (Twilio, Hubtel, etc.)
}