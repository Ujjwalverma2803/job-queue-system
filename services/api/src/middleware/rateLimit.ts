import rateLimit from "express-rate-limit";
import { AuthRequest } from "./auth";

export const createRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000,
    max: (req) => {
      const authReq = req as AuthRequest;
      return authReq.user?.tier === "premium" ? 200 : 20;
    },
    keyGenerator: (req) => {
      const authReq = req as AuthRequest;
      return authReq.user?.api_key || req.ip || "unknown";
    },
    handler: (req, res) => {
      const authReq = req as AuthRequest;
      const tier = authReq.user?.tier || "free";
      const limit = tier === "premium" ? 200 : 20;
      res.status(429).json({
        error: "Rate limit exceeded",
        tier,
        limit: `${limit} requests per minute`,
        upgrade:
          tier === "free" ? "Upgrade to premium for 200 req/min" : undefined,
      });
    },
  });
};
