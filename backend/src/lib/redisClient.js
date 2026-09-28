const IORedis = require('ioredis');

const connectionRedis = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT) || 6379,

  ...(process.env.REDIS_PASSWORD && {
    password: process.env.REDIS_PASSWORD
  }),

  ...(process.env.REDIS_USER && {
    username: process.env.REDIS_USER
  }),

  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const REUSE_WINDOW_SEC = 60 * 60 * 24;

module.exports = {
  connectionRedis,
  REUSE_WINDOW_SEC
};