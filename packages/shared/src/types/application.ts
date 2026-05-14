import type { Address, Contact, WorkAuth, Citizenship } from "./profile";
import type { DocumentRecord } from "./document";

export type ApplicationStatus = "pending" | "approved" | "rejected";

// Re-export so callers can import from one place
export type { DocumentRecord as ApplicationDocument };

// Snapshot reuses the same sub-types as Profile — one source of truth
export interface ApplicationSnapshot {
  firstName: string;
  lastName: string;
  middleName?: string;
  preferredName?: string;
  email: string;
  cellPhone: string;
  workPhone?: string;
  ssn: string;
  dob: string;
  gender: "male" | "female" | "no_answer";
  address: Address;
  citizenship: Citizenship;
  workAuth?: WorkAuth;
  reference?: Contact;
  emergencyContacts: Contact[];
  profilePictureDocId?: string;
  driversLicenseDocId?: string;
  workAuthDocId?: string;
  OPTReceiptDocId?: string;
}

export interface Application {
  _id: string;
  user: { _id: string; username: string; email: string };
  status: ApplicationStatus;
  feedback?: string;
  snapshot: ApplicationSnapshot;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithDocs {
  application: Application | null;
  documents: {
    optReceipt: DocumentRecord | null;
    workAuth: DocumentRecord | null;
    driversLicense: DocumentRecord | null;
  };
}

export interface ApplicationListResponse {
  applications: Application[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
