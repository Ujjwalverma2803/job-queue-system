import { Pool } from "pg";
import logger from "../utils/logger";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => logger.info("PostgreSQL connected"));
pool.on("error", (err) => logger.error(`PostgreSQL error: ${err.message}`));

export default pool;
