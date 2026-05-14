import type { DOC_TYPES, DOC_CATEGORIES } from "../schemas/documentSchema";

export type DocType = (typeof DOC_TYPES)[number];
export type DocCategory = (typeof DOC_CATEGORIES)[number];
export type DocStatus = "pending" | "approved" | "rejected";

export interface DocumentRecord {
  _id: string;
  user: string;
  type: DocType;
  category: DocCategory;
  filename: string;
  mimetype: string;
  size: number;
  status: DocStatus;
  feedback?: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
