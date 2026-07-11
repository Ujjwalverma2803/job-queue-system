import app from "./app";
import logger from "./utils/logger";

// Fix for self-signed certificate in certificate chain
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const PORT = process.env.API_PORT || 3000;

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
