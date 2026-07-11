import Bull from "bull";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

const isSSL = redisUrl.startsWith("rediss://");

const queueOptions: Bull.QueueOptions = {
  redis: redisUrl,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
};

if (isSSL) {
  queueOptions.redis = {
    port: 6379,
    host: redisUrl.split("@")[1]?.split(":")[0] || "",
    password: redisUrl.split(":")[2]?.split("@")[0] || "",
    tls: {
      rejectUnauthorized: false,
    },
  } as any;
}

export const emailQueue = new Bull("email", queueOptions);
export const imageQueue = new Bull("image", queueOptions);
export const reportQueue = new Bull("report", queueOptions);

export default { emailQueue, imageQueue, reportQueue };
