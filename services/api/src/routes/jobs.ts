import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";
import { emailQueue, imageQueue, reportQueue } from "../config/queue";
import pool from "../config/db";
import logger from "../utils/logger";

const router = Router();
const rateLimiter = createRateLimiter();

type Priority = "high" | "medium" | "low";
type JobType = "email" | "image" | "report";

const PRIORITY_MAP: Record<Priority, number> = {
  high: 1,
  medium: 5,
  low: 10,
};

const getQueue = (type: JobType) => {
  switch (type) {
    case "email":
      return emailQueue;
    case "image":
      return imageQueue;
    case "report":
      return reportQueue;
  }
};

// POST /jobs — Submit a new job
router.post(
  "/jobs",
  authenticate,
  rateLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { type, payload, priority = "medium" } = req.body;

    if (!type || !payload) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["type", "payload"],
      });
      return;
    }

    const validTypes: JobType[] = ["email", "image", "report"];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: "Invalid job type",
        valid_types: validTypes,
      });
      return;
    }

    const validPriorities: Priority[] = ["high", "medium", "low"];
    if (!validPriorities.includes(priority)) {
      res.status(400).json({
        error: "Invalid priority",
        valid_priorities: validPriorities,
      });
      return;
    }

    if (priority === "high" && req.user?.tier !== "premium") {
      res.status(403).json({
        error: "High priority jobs require premium tier",
        your_tier: req.user?.tier,
        upgrade: "Use x-api-key: premium-api-key-456 for premium access",
      });
      return;
    }

    try {
      const jobId = uuidv4();

      // Save to PostgreSQL
      await pool.query(
        `INSERT INTO jobs 
         (id, type, priority, status, payload, max_attempts)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [jobId, type, priority, "pending", payload, 3],
      );

      // Get correct queue and add job
      const queue = getQueue(type as JobType);
      await queue.add(
        { jobId, type, payload, userId: req.user?.id },
        {
          priority: PRIORITY_MAP[priority as Priority],
          jobId,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      logger.info(
        `Job ${jobId} submitted — type: ${type}, priority: ${priority}`,
      );

      res.status(201).json({
        job_id: jobId,
        type,
        priority,
        status: "pending",
        message: "Job submitted successfully",
        monitor: "http://localhost:3001",
      });
    } catch (err) {
      logger.error(`Job submission error: ${err}`);
      res.status(500).json({ error: "Failed to submit job" });
    }
  },
);

// GET /jobs/:id — Get job status
router.get(
  "/jobs/:id",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      res.json(result.rows[0]);
    } catch (err) {
      logger.error(`Get job error: ${err}`);
      res.status(500).json({ error: "Failed to get job" });
    }
  },
);

// GET /jobs — List all jobs with filters
router.get(
  "/jobs",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, type, priority, limit = "20", offset = "0" } = req.query;

    try {
      let query = "SELECT * FROM jobs WHERE 1=1";
      const params: (string | number)[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        params.push(status as string);
      }
      if (type) {
        query += ` AND type = $${paramCount++}`;
        params.push(type as string);
      }
      if (priority) {
        query += ` AND priority = $${paramCount++}`;
        params.push(priority as string);
      }

      query += ` ORDER BY created_at DESC`;
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(parseInt(limit as string));
      params.push(parseInt(offset as string));

      const result = await pool.query(query, params);
      const countResult = await pool.query("SELECT COUNT(*) FROM jobs");

      res.json({
        jobs: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (err) {
      logger.error(`List jobs error: ${err}`);
      res.status(500).json({ error: "Failed to list jobs" });
    }
  },
);

// DELETE /jobs/:id — Cancel a pending job
router.delete(
  "/jobs/:id",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `UPDATE jobs SET status = 'cancelled'
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          error: "Job not found or already processing",
        });
        return;
      }

      res.json({
        message: "Job cancelled successfully",
        job: result.rows[0],
      });
    } catch (err) {
      logger.error(`Cancel job error: ${err}`);
      res.status(500).json({ error: "Failed to cancel job" });
    }
  },
);

// GET /stats — Queue statistics
router.get(
  "/stats",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(`
        SELECT 
          status,
          type,
          COUNT(*) as count
        FROM jobs
        GROUP BY status, type
        ORDER BY status, type
      `);

      const stats: Record<string, Record<string, number>> = {};
      result.rows.forEach((row) => {
        if (!stats[row.status]) stats[row.status] = {};
        stats[row.status][row.type] = parseInt(row.count);
      });

      const totals = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) as total
        FROM jobs
      `);

      res.json({
        totals: totals.rows[0],
        breakdown: stats,
        monitor_url: "http://localhost:3001",
      });
    } catch (err) {
      logger.error(`Stats error: ${err}`);
      res.status(500).json({ error: "Failed to get stats" });
    }
  },
);

export default router;
