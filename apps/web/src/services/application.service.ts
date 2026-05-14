import {
  type submitApplicationSchema,
  type reviewApplicationSchema,
  type ApplicationStatus,
  type Application,
  type ApplicationWithDocs,
  type ApplicationListResponse,
} from "shared";
import type { z } from "zod";
import apiClient from "@/lib/api";

// ── Input types ───────────────────────────────────────────────────────────────

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;

// Re-export shared types so callers import from one place
export type { ApplicationStatus, Application, ApplicationWithDocs, ApplicationListResponse };

// ── Service ───────────────────────────────────────────────────────────────────

export const applicationService = {
  // Employee —————————————————————————————————————————————————————————————————

  async getMyApplication(): Promise<ApplicationWithDocs> {
    const res = await apiClient.get<ApplicationWithDocs>("/api/onboarding/me");
    return res.data;
  },

  async submit(data: SubmitApplicationInput): Promise<{ application: Application }> {
    const res = await apiClient.post<{ application: Application }>(
      "/api/onboarding",
      data,
    );
    return res.data;
  },

  // HR ———————————————————————————————————————————————————————————————————————

  async getAll(
    page = 1,
    limit = 20,
    status?: ApplicationStatus,
  ): Promise<ApplicationListResponse> {
    const res = await apiClient.get<ApplicationListResponse>(
      "/api/onboarding",
      { params: { page, limit, ...(status ? { status } : {}) } },
    );
    return res.data;
  },

  async getById(id: string): Promise<ApplicationWithDocs> {
    const res = await apiClient.get<ApplicationWithDocs>(
      `/api/onboarding/${id}`,
    );
    return res.data;
  },

  async review(
    id: string,
    data: ReviewApplicationInput,
  ): Promise<{ application: Application }> {
    const res = await apiClient.patch<{ application: Application }>(
      `/api/onboarding/${id}/review`,
      data,
    );
    return res.data;
  },
};
