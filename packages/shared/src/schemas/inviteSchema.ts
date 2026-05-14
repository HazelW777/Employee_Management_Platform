import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase() // Trim whitespace and convert to lowercase for consistency
  .pipe(z.email({ message: "Invalid email format" }));

export const sendInvitationSchema = z.object({
  email: emailSchema,
});

export const getInvitationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
