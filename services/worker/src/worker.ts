// Fix for self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { emailQueue, imageQueue, reportQueue } from "./config/queue";
import { processEmail } from "./processors/emailProcessor";
import { processImage } from "./processors/imageProcessor";
import { processReport } from "./processors/reportProcessor";
import pool from "./config/db";
import logger from "./utils/logger";

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "5");

// Queue processors
emailQueue.process(CONCURRENCY, async (job) => {
  return await processEmail(job);
});

imageQueue.process(CONCURRENCY, async (job) => {
  return await processImage(job);
});

reportQueue.process(CONCURRENCY, async (job) => {
  return await processReport(job);
});

// Queue event handlers
[emailQueue, imageQueue, reportQueue].forEach((queue) => {
  queue.on("completed", (job) => {
    logger.info(`Job ${job.id} completed in queue ${queue.name}`);
  });

  queue.on("failed", async (job, err) => {
    logger.error(`Job ${job.id} failed in queue ${queue.name}: ${err.message}`);

    if (job?.data?.jobId) {
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
          `Job ${job.data.jobId} moved to dead letter — all attempts exhausted`,
        );
      } else {
        logger.info(
          `Job ${job.data.jobId} will retry — attempt ${job.attemptsMade} of ${job.opts.attempts}`,
        );
      }
    }
  });

  queue.on("stalled", (job) => {
    logger.warn(`Job ${job.id} stalled in queue ${queue.name}`);
  });
});

// Tiny health server so Render treats this as a web service
const app = express();
const PORT = parseInt(process.env.PORT || "3002");

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      service: "job-queue-worker",
      queues: ["email", "image", "report"],
      concurrency: CONCURRENCY,
    });
  } catch (err: any) {
    res.status(503).json({
      status: "error",
      service: "job-queue-worker",
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  logger.info("Worker started");
  logger.info(`Processing queues: email, image, report`);
  logger.info(`Concurrency: ${CONCURRENCY} per queue`);
  logger.info(`Worker health server running on port ${PORT}`);
});
