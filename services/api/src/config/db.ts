import { Pool } from "pg";
import logger from "../utils/logger";
import fs from "fs";

const connectionString = process.env.DATABASE_URL;

logger.info(`Connecting to database...`);

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => logger.info("PostgreSQL connected successfully"));
pool.on("error", (err) => {
  logger.error(`PostgreSQL pool error: ${err.message}`);
});

export default pool;
