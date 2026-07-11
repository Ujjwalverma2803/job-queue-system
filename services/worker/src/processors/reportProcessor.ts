import { Job } from "bull";
import pool from "../config/db";
import logger from "../utils/logger";

export async function processReport(job: Job): Promise<object> {
  const { jobId, payload } = job.data;

  logger.info(`Processing report job ${jobId}`);

  await pool.query(
    `UPDATE jobs SET status = 'active', started_at = NOW(),
     attempts = attempts + 1 WHERE id = $1`,
    [jobId],
  );

  // Simulate report generation
  const processingTime = Math.random() * 3000 + 2000;
  await new Promise((resolve) => setTimeout(resolve, processingTime));

  const { report_type, date_range, filters = {} } = payload;

  if (!report_type) {
    throw new Error("Missing required field: report_type");
  }

  const result = {
    generated: true,
    report_type,
    date_range,
    filters,
    rows_processed: Math.floor(Math.random() * 10000),
    download_url: `https://reports.example.com/${jobId}.pdf`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    timestamp: new Date().toISOString(),
  };

  await pool.query(
    `UPDATE jobs SET status = 'completed',
     result = $1, completed_at = NOW() WHERE id = $2`,
    [JSON.stringify(result), jobId],
  );

  logger.info(`Report job ${jobId} completed`);
  return result;
}
