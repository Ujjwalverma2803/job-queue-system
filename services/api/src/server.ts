import app from "./app";
import logger from "./utils/logger";

const PORT = process.env.API_PORT || 3000;

// Prevent unhandled errors from crashing the process
process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
});

app.listen(PORT, () => {
  logger.info(`API Server running on port ${PORT}`);
  logger.info(`Health check at http://localhost:${PORT}/health`);
});
