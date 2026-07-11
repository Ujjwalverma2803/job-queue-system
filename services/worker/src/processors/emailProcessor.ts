import { Job } from "bull";
import pool from "../config/db";
import logger from "../utils/logger";

export async function processEmail(job: Job): Promise<object> {
  const { jobId, payload } = job.data;

  logger.info(`Processing email job ${jobId}`);

  // Mark as active
  await pool.query(
    `UPDATE jobs SET status = 'active', started_at = NOW(),
     attempts = attempts + 1 WHERE id = $1`,
    [jobId],
  );

  // Simulate email sending
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { to, subject, body } = payload;

  if (!to || !subject) {
    throw new Error("Missing required email fields: to, subject");
  }

  const result = {
    sent: true,
    to,
    subject,
    timestamp: new Date().toISOString(),
    message_id: `msg_${Date.now()}`,
  };

  // Mark as completed
  await pool.query(
    `UPDATE jobs SET status = 'completed', 
     result = $1, completed_at = NOW() WHERE id = $2`,
    [JSON.stringify(result), jobId],
  );

  logger.info(`Email job ${jobId} completed — sent to ${to}`);
  return result;
}
