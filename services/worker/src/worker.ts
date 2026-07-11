import dotenv from "dotenv";
dotenv.config();

import { emailQueue, imageQueue, reportQueue } from "./config/queue";
import { processEmail } from "./processors/emailProcessor";
import { processImage } from "./processors/imageProcessor";
import { processReport } from "./processors/reportProcessor";
import pool from "./config/db";
import logger from "./utils/logger";

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "5");

// Email queue processor
emailQueue.process(CONCURRENCY, async (job) => {
  return await processEmail(job);
});

// Image queue processor
imageQueue.process(CONCURRENCY, async (job) => {
  return await processImage(job);
});

// Report queue processor
reportQueue.process(CONCURRENCY, async (job) => {
  return await processReport(job);
});

// Event handlers for all queues
[emailQueue, imageQueue, reportQueue].forEach((queue) => {
  queue.on("completed", (job) => {
    logger.info(`Job ${job.id} completed in queue ${queue.name}`);
  });

  queue.on("failed", async (job, err) => {
    logger.error(`Job ${job.id} failed in queue ${queue.name}: ${err.message}`);

    // Update database on failure
    if (job.data.jobId) {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3);

      await pool.query(
        `UPDATE jobs SET
         status = $1,
         error = $2,
         failed_at = CASE WHEN $3 THEN NOW() ELSE failed_at END
         WHERE id = $4`,
        [
          isLastAttempt ? "failed" : "pending",
          err.message,
          isLastAttempt,
          job.data.jobId,
        ],
      );

      if (isLastAttempt) {
        logger.error(
          `Job ${job.data.jobId} moved to dead letter — 
           all ${job.opts.attempts} attempts exhausted`,
        );
      } else {
        logger.info(
          `Job ${job.data.jobId} will retry — 
           attempt ${job.attemptsMade} of ${job.opts.attempts}`,
        );
      }
    }
  });

  queue.on("stalled", (job) => {
    logger.warn(`Job ${job.id} stalled in queue ${queue.name} — will retry`);
  });
});

logger.info("Worker started");
logger.info(`Processing queues: email, image, report`);
logger.info(`Concurrency: ${CONCURRENCY} per queue`);
