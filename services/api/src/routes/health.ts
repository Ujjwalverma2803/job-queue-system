import { Router, Request, Response } from "express";
import pool from "../config/db";
import { redis } from "../config/redis";
import logger from "../utils/logger";

const router = Router();

router.get("/health", async (req: Request, res: Response) => {
  let postgresStatus = "disconnected";
  let redisStatus = "disconnected";
  let postgresError = "";
  let redisError = "";

  try {
    await pool.query("SELECT 1");
    postgresStatus = "connected";
  } catch (err: any) {
    postgresStatus = "error";
    postgresError = err.message;
    logger.error(`Health check postgres error: ${err.message}`);
  }

  try {
    const ping = await redis.ping();
    redisStatus = ping === "PONG" ? "connected" : "error";
  } catch (err: any) {
    redisStatus = "error";
    redisError = err.message;
    logger.error(`Health check redis error: ${err.message}`);
  }

  const allHealthy =
    postgresStatus === "connected" && redisStatus === "connected";

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "error",
    service: "job-queue-api",
    timestamp: new Date().toISOString(),
    dependencies: {
      postgres: postgresStatus,
      postgres_error: postgresError || undefined,
      redis: redisStatus,
      redis_error: redisError || undefined,
    },
  });
});

export default router;
