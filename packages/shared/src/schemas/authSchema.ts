import { z } from "zod";
import { emailSchema } from "./inviteSchema";

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(100, { message: "Password is too long" })
  .regex(/[A-Z]/, { message: "Must contain uppercase letter" })
  .regex(/[a-z]/, { message: "Must contain lowercase letter" })
  .regex(/\d/, { message: "Must contain a number" });

export const signupSchema = z.object({
  token: z.string().min(1, { message: "Invitation token is required" }),
  username: z.string().trim().min(1, { message: "Username is required" }),
  password: passwordSchema,
});

export const signinSchema = z.object({
  username: z.string().trim().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, { message: "Old password is required" }),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  newPassword: passwordSchema,
});
