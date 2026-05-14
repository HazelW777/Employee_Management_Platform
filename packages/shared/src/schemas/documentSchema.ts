import { z } from "zod";

export const DOC_TYPES = [
  "profile_picture",
  "drivers_license",
  "work_auth",
  "opt_receipt",
  "opt_ead",
  "i983",
  "i20",
] as const;

export const DOC_CATEGORIES = ["onboarding", "visa"] as const;

export type DocType = (typeof DOC_TYPES)[number];
export type DocCategory = (typeof DOC_CATEGORIES)[number];

// OPT visa chain — order matters: each step requires the previous to be approved
export const OPT_CHAIN = [
  "opt_receipt",
  "opt_ead",
  "i983",
  "i20",
] as const satisfies readonly DocType[];

export type OptStep = (typeof OPT_CHAIN)[number];

export const OPT_STEP_LABELS: Record<OptStep, string> = {
  opt_receipt: "OPT Receipt",
  opt_ead: "OPT EAD",
  i983: "I-983",
  i20: "I-20",
};

export const uploadDocumentSchema = z.object({
  type: z.enum(DOC_TYPES),
  category: z.enum(DOC_CATEGORIES),
});

export const reviewDocumentSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  feedback: z.string().trim().optional(),
});
