import { z } from "zod";
import { updateProfileSchema } from "./profileSchema";

// Employee submits their onboarding application for HR review.
// The snapshot stored server-side mirrors this shape exactly.
export const submitApplicationSchema = updateProfileSchema;

export const reviewApplicationSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  feedback: z.string().optional(),
});
