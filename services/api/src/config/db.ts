import { Pool } from "pg";
import logger from "../utils/logger";

const connectionString = process.env.DATABASE_URL;

logger.info(`Connecting to database...`);
logger.info(`DB URL starts with: ${connectionString?.substring(0, 50)}`);

export const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
        }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => logger.info("PostgreSQL connected successfully"));
pool.on("error", (err) => {
  logger.error(`PostgreSQL pool error: ${err.message}`);
});

export default pool;
