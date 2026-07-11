import app from "./app";
import logger from "./utils/logger";

const PORT = process.env.API_PORT || 3000;

app.listen(PORT, () => {
  logger.info(`API Server running on port ${PORT}`);
  logger.info(`Bull Board available at http://localhost:3001`);
  logger.info(`Health check at http://localhost:${PORT}/health`);
});
