export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  _id: string;
  email: string;
  createdBy: { _id: string; email: string };
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  invalidated: boolean;
  invalidatedAt?: string;
  createdAt: string;
  status: InvitationStatus;
}

export interface InvitationListResponse {
  invitations: Invitation[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
