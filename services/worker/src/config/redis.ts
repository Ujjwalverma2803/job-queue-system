import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const isSSL = redisUrl.startsWith("rediss://");

let redis: IORedis.Redis;

if (isSSL) {
  const url = new URL(redisUrl);
  redis = new IORedis({
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: decodeURIComponent(url.password),
    username: url.username || "default",
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
} else {
  redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export { redis };
export default redis;
