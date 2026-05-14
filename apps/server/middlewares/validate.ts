import { ZodType } from "zod";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

export const validate =
  (schema: ZodType, source: "body" | "params" | "query" = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const message = result.error.issues
        .map((i) => {
          const path = i.path.length > 0 ? i.path.join(".") : "value";
          return `${path}: ${i.message}`;
        })
        .join("; ");
      next(new AppError(message, 400));
      return;
    }

    req[source] = result.data;
    next();
  };
