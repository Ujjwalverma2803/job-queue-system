import { Request, Response, NextFunction } from "express";
import pool from "../config/db";
import logger from "../utils/logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    tier: string;
    api_key: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({
      error: "Missing API key",
      hint: "Pass your API key in the x-api-key header",
    });
    return;
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE api_key = $1", [
      apiKey,
    ]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    logger.error(`Auth error: ${err}`);
    res.status(500).json({ error: "Authentication failed" });
  }
}
