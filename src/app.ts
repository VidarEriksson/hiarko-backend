import express from "express";
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/board";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use("/auth", authRoutes);
  app.use("/boards", boardRoutes);

  return app;
}
