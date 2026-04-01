import express, { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/board";
import columnRoutes from "./routes/column";
import taskRoutes from "./routes/task";
import orgRoutes from "./routes/org";
import inviteRoutes from "./routes/invites";
import cors from "cors";
import path from "path";

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
  app.use("/tasks", taskRoutes);
  app.use("/orgs", orgRoutes);
  app.use("/invites", inviteRoutes);

  app.use(express.static(path.join(process.cwd(), "public")));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500;
    const message = err.message ?? "Internal server error";
    res.status(status).json({ message });
  });

  return app;
}
