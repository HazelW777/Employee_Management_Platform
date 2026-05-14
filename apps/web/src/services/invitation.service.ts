import {
  type sendInvitationSchema,
  type InvitationStatus,
  type Invitation,
  type InvitationListResponse,
} from "shared";
import type { z } from "zod";
import apiClient from "@/lib/api";

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;

export type { InvitationStatus, Invitation, InvitationListResponse };

export const invitationService = {
  async getAll(page = 1, limit = 20): Promise<InvitationListResponse> {
    const res = await apiClient.get<InvitationListResponse>("/api/hr/invites", {
      params: { page, limit },
    });
    return res.data;
  },

  async send(data: SendInvitationInput): Promise<void> {
    await apiClient.post("/api/hr/invites", data);
  },

  async resend(id: string): Promise<void> {
    await apiClient.post(`/api/hr/invites/${id}/resend`);
  },

  async revoke(id: string): Promise<void> {
    await apiClient.patch(`/api/hr/invites/${id}/revoke`);
  },
};
