import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5001"),
  MONGO_URI: z.string(),
  CLIENT_URL: z.string().url({ message: "CLIENT_URL must be a valid URL" }),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("30d"),
  EMAIL_USERNAME: z.string(),
  EMAIL_PASSWORD: z.string(),
  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.coerce.number(),
  EMAIL_FROM: z.string(),
});

export const env = envSchema.parse(process.env);