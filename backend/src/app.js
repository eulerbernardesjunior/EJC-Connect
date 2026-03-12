import fs from "node:fs/promises";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

export async function createApp() {
  await fs.mkdir(env.uploadDir, { recursive: true });

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(env.uploadDir));

  app.use("/api", apiRoutes);
  app.use(errorHandler);

  return app;
}
