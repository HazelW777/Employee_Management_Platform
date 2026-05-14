import mongoose, { Document, Schema } from "mongoose";

export const DOC_TYPES = [
  "profile_picture",
  "drivers_license",
  "work_auth",
  "opt_receipt",
  "opt_ead",
  "i983",
  "i20",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_CATEGORIES = ["onboarding", "visa"] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const DOC_STATUSES = ["pending", "approved", "rejected"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

// Visa-stage documents that go through HR review one by one
export const REVIEWABLE_TYPES = new Set<DocType>([
  "opt_receipt",
  "opt_ead",
  "i983",
  "i20",
]);

export interface IDocument extends Document {
  user: mongoose.Types.ObjectId;
  category: DocCategory;
  type: DocType;
  storedPath: string;
  filename: string;
  mimetype: string;
  size: number;
  status: DocStatus;
  feedback?: string;
  uploadedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
}

const documentSchema = new Schema<IDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: DOC_CATEGORIES, required: true },
    type: { type: String, enum: DOC_TYPES, required: true },
    storedPath: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    status: { type: String, enum: DOC_STATUSES, default: "pending" },
    feedback: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

documentSchema.index({ user: 1, type: 1 });
documentSchema.index({ category: 1, status: 1 });

const DocumentModel = mongoose.model<IDocument>("Document", documentSchema);
export default DocumentModel;
