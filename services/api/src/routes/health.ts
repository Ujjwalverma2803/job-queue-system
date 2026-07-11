import { Router, Request, Response } from "express";
import pool from "../config/db";
import { redis } from "../config/redis";

const router = Router();

router.get("/health", async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    const redisPing = await redis.ping();

    res.json({
      status: "ok",
      service: "job-queue-api",
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: "connected",
        redis: redisPing === "PONG" ? "connected" : "error",
      },
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      service: "job-queue-api",
    });
  }
});

export default router;
