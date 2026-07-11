import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

const redisOptions: IORedis.RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

if (redisUrl.startsWith("rediss://")) {
  redisOptions.tls = {
    rejectUnauthorized: false,
  };
}

export const redis = new IORedis(redisUrl, redisOptions);

export default redis;
