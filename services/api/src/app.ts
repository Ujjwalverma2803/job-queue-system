import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import healthRouter from "./routes/health";
import jobsRouter from "./routes/jobs";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/", healthRouter);
app.use("/api", jobsRouter);

app.use(errorHandler);

export default app;
