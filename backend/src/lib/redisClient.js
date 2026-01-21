const IORedis = require('ioredis');

// const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
/* const redis = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379
}); */
const connectionRedis = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const REUSE_WINDOW_SEC = 60 * 60 * 24; // 24 hours for reuse counters

module.exports = {
  connectionRedis,
  REUSE_WINDOW_SEC
};