import Bull from "bull";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const isSSL = redisUrl.startsWith("rediss://");

const createRedisClient = () => {
  const IORedis = require("ioredis");
  if (isSSL) {
    const url = new URL(redisUrl);
    return new IORedis({
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: decodeURIComponent(url.password),
      username: url.username || "default",
      tls: { rejectUnauthorized: false },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

const queueOptions: Bull.QueueOptions = {
  createClient: createRedisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
};

export const emailQueue = new Bull("email", queueOptions);
export const imageQueue = new Bull("image", queueOptions);
export const reportQueue = new Bull("report", queueOptions);

export default { emailQueue, imageQueue, reportQueue };
