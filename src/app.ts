import express from "express";
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/board";
import columnRoutes from "./routes/column";
import cors from "cors";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );

  app.use(express.json());

  app.use("/auth", authRoutes);
  app.use("/boards", boardRoutes);
  app.use("/columns", columnRoutes);

  return app;
}
