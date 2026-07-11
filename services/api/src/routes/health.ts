import { Router, Request, Response } from "express";
import pool from "../config/db";
import { redis } from "../config/redis";

const router = Router();

router.get("/health", async (req: Request, res: Response) => {
  let postgresStatus = "disconnected";
  let redisStatus = "disconnected";

  try {
    await pool.query("SELECT 1");
    postgresStatus = "connected";
  } catch (err) {
    postgresStatus = "error";
  }

  try {
    const ping = await redis.ping();
    redisStatus = ping === "PONG" ? "connected" : "error";
  } catch (err) {
    redisStatus = "error";
  }

  const allHealthy =
    postgresStatus === "connected" && redisStatus === "connected";

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "error",
    service: "job-queue-api",
    timestamp: new Date().toISOString(),
    dependencies: {
      postgres: postgresStatus,
      redis: redisStatus,
    },
  });
});

export default router;
