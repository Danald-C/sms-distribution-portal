const IORedis = require('ioredis');

const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
// helper TTLs
const REUSE_WINDOW_SEC = 60 * 60 * 24; // 24 hours for reuse counters

module.exports = {
  redis,
  REUSE_WINDOW_SEC
};