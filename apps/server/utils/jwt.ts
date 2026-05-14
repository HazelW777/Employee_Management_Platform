import jwt, { SignOptions } from "jsonwebtoken";
import ms, { StringValue } from "ms";
import { env } from "../config/env";

export interface JwtPayload {
  id: string;
  role: "hr" | "employee";
}

export const signToken = (id: string, role: "hr" | "employee"): string => {
  return jwt.sign({ id, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const, // CSRF protection
  maxAge: ms(env.JWT_EXPIRES_IN as StringValue),
};
