import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import AppError from "../utils/AppError";

export const protect = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token =
    req.cookies?.token ??
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) throw new AppError("Not authenticated", 401);

  try {
    req.user = verifyToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
  next();
};

export const restrictTo =
  (...roles: Array<"hr" | "employee">) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
      );
    }
    next();
  };
