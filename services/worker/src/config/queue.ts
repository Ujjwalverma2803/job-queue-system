import Bull from "bull";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

const queueOptions = {
  redis: redisUrl,
};

export const emailQueue = new Bull("email", queueOptions);
export const imageQueue = new Bull("image", queueOptions);
export const reportQueue = new Bull("report", queueOptions);

export default { emailQueue, imageQueue, reportQueue };
