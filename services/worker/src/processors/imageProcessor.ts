import { Job } from "bull";
import pool from "../config/db";
import logger from "../utils/logger";

export async function processImage(job: Job): Promise<object> {
  const { jobId, payload } = job.data;

  logger.info(`Processing image job ${jobId}`);

  await pool.query(
    `UPDATE jobs SET status = 'active', started_at = NOW(),
     attempts = attempts + 1 WHERE id = $1`,
    [jobId],
  );

  // Simulate image processing
  const processingTime = Math.random() * 2000 + 1000;
  await new Promise((resolve) => setTimeout(resolve, processingTime));

  const { url, operations = [] } = payload;

  if (!url) {
    throw new Error("Missing required field: url");
  }

  const result = {
    processed: true,
    original_url: url,
    operations_applied: operations,
    output_url: `https://cdn.example.com/processed/${Date.now()}.jpg`,
    processing_time_ms: Math.round(processingTime),
    timestamp: new Date().toISOString(),
  };

  await pool.query(
    `UPDATE jobs SET status = 'completed',
     result = $1, completed_at = NOW() WHERE id = $2`,
    [JSON.stringify(result), jobId],
  );

  logger.info(`Image job ${jobId} completed`);
  return result;
}
