import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
}
