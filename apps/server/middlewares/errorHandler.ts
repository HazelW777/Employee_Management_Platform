import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

export function errorHandler(
  err: Error & {
    statusCode?: number;
    isOperational?: boolean;
    errors?: Record<string, { message: string }>;
  },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: "error", message: err.message });
    return;
  }

  if (err.name === "ValidationError") {
    res.status(400).json({
      status: "error",
      message: Object.values(err.errors ?? {})
        .map((e) => e.message)
        .join(", "),
    });
    return;
  }

  if (err.name === "CastError") {
    res.status(400).json({ status: "error", message: "Invalid ID format" });
    return;
  }

  if (err.name === "JsonWebTokenError") {
    res.status(401).json({ status: "error", message: "Invalid token" });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({ status: "error", message: "Token expired" });
    return;
  }

  console.error("Unexpected error:", err);
  res.status(500).json({ status: "error", message: "Internal server error" });
}
