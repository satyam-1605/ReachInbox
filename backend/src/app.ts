import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./config/db.js";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { bullBoardRouter } from "./queue/bullBoard.js";

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Bull Board UI
app.use("/admin/queues", bullBoardRouter);

// API routes
app.use("/", apiRouter);

// Health check endpoint
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Central error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

