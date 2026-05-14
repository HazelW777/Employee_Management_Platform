import { z } from "zod";

export const addressSchema = z.object({
  addressLine1: z
    .string()
    .trim()
    .min(1, { message: "Address line 1 is required" }),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, { message: "City is required" }),
  state: z.string().trim().min(1, { message: "State is required" }),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, { message: "Invalid ZIP code" }),
});

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  middleName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  relationship: z
    .string()
    .trim()
    .min(1, { message: "Relationship is required" }),
});

export const workAuthTypeSchema = z.enum([
  "H1B",
  "L2",
  "F1-CPT",
  "F1-OPT",
  "H4",
  "other",
]);

export const workAuthSchema = z.object({
  type: workAuthTypeSchema,
  otherTitle: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const CITIZENSHIP_TYPE_LABELS: Record<"citizen" | "green_card", string> =
  {
    citizen: "Citizen",
    green_card: "Green Card",
  };

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const citizenshipSchema = z.object({
  isPermanentResidentOrCitizen: z.boolean(),
  type: z.preprocess(
    emptyToUndefined,
    z.enum(["citizen", "green_card"]).optional(),
  ),
});

const isMeaningful = (v: unknown) =>
  v !== undefined && v !== null && v !== "";

const workAuthOptional = z.preprocess((v) => {
  if (!v || typeof v !== "object") return v;
  const w = v as Record<string, unknown>;
  return Object.values(w).some(isMeaningful) ? v : undefined;
}, workAuthSchema.optional());

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  middleName: z.string().trim().optional(),
  preferredName: z.string().trim().optional(),
  address: addressSchema,
  cellPhone: z.string().trim().min(1, { message: "Cell phone is required" }),
  workPhone: z.string().trim().optional(),
  ssn: z
    .string()
    .trim()
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, { message: "Invalid SSN format" }),
  dob: z.coerce.date(),
  gender: z.enum(["male", "female", "no_answer"]),
  citizenship: citizenshipSchema,
  workAuth: workAuthOptional,
  reference: contactSchema.optional(),
  emergencyContacts: z
    .array(contactSchema)
    .min(1, { message: "At least one emergency contact is required" }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
