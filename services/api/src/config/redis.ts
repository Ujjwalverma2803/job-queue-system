import IORedis, { Redis, RedisOptions } from "ioredis";
import logger from "../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const isSSL = redisUrl.startsWith("rediss://");

let redis: Redis;

if (isSSL) {
  const url = new URL(redisUrl);
  const options: RedisOptions = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: decodeURIComponent(url.password),
    username: url.username || "default",
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 500, 3000);
    },
  };
  redis = new IORedis(options);
} else {
  redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 500, 3000);
    },
  });
}

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => {
  logger.error(`Redis error: ${err.message}`);
});

export { redis };
export default redis;
