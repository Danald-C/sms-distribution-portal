// SMS API to providers
const { Worker } = require('bullmq');
const { connectionRedis } = require('../lib/redisClient');
const axios = require('axios');

async function sendSmsViaProvider(sender, to, message) {
  console.log(`📨 Sending SMS to ${to}: ${message}. From: ${sender}`);

  const data = {
    sender,
    message,
    recipients: to
  };

  const config = {
    method: 'post',
    url: process.env.SMS_PROVIDER_API_URL,
    headers: {
      'api-key': process.env.SMS_PROVIDER_API_KEY,
      'Content-Type': 'application/json'
    },
    data,
    timeout: 30000
  };

  try {
    const response = await axios(config);

    console.log('✅ Arkesel response:', JSON.stringify(response.data));

    return response.data;
  } catch (error) {
    console.error('❌ Arkesel SMS error:', {
      code: error.code,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    throw error;
  }
}

const smsWorker = new Worker(
  'sms-queue',
  async job => {
    const { sender, to, message } = job.data;

    console.log(`🔄 Processing SMS job ${job.id}`);

    await sendSmsViaProvider(sender, to, message);

    console.log(`✅ SMS job ${job.id} completed`);
  },
  {
    connection: connectionRedis
  }
);

smsWorker.on('ready', () => {
  console.log('🚀 SMS worker ready to process jobs...');
});

smsWorker.on('completed', job => {
  console.log(`✅ BullMQ completed job ${job.id}`);
});

smsWorker.on('failed', (job, error) => {
  console.error(
    `❌ BullMQ job ${job?.id} failed:`,
    error.message
  );
});

smsWorker.on('error', error => {
  console.error('❌ SMS worker error:', error);
});

module.exports = {
  sendSmsViaProvider
};



/* // SMS API to providers 
const { Worker } = require('bullmq');
const { connectionRedis } = require('../lib/redisClient');
const axios = require('axios');

async function sendSmsViaProvider(sender, to, message) {
  console.log(`📨 Sending SMS to ${to}: ${message}. From: ${sender}`);
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
      console.log(JSON.stringify(error));
    });
  // integrate real provider here (Twilio, Hubtel, etc.)
}

const processWorker = async () => {
  console.log('Worker ready to process SMS jobs...');
  try{
    new Worker('sms-queue', async job => {
      const { sender, to, message } = job.data;
      // console.log('To:', to + '; Message: ' + message);
      await sendSmsViaProvider(sender, to, message);
    }, { connection: connectionRedis });
  } catch (error) {
    console.error('Error starting SMS worker:', error);
  }
}

module.exports = { processWorker }; */