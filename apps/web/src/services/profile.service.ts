import { type updateProfileSchema, type Profile } from "shared";
import type { z } from "zod";
import apiClient from "@/lib/api";

// ── Input types ───────────────────────────────────────────────────────────────

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PatchProfileInput = Partial<UpdateProfileInput>;

// ── Response types ────────────────────────────────────────────────────────────

export type { Profile };

export interface ProfileListResponse {
  profiles: Profile[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const profileService = {
  // Employee ——————————————————————————————————————————————————————————————————

  async getMyProfile(): Promise<Profile> {
    const res = await apiClient.get<{ profile: Profile }>("/api/profiles/me");
    return res.data.profile;
  },

  async updateMyProfile(data: PatchProfileInput): Promise<Profile> {
    const res = await apiClient.patch<{ profile: Profile }>(
      "/api/profiles/me",
      data,
    );
    return res.data.profile;
  },

  // HR ————————————————————————————————————————————————————————————————————————

  async getAll(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<ProfileListResponse> {
    const res = await apiClient.get<ProfileListResponse>("/api/profiles", {
      params: { page, limit, ...(search ? { search } : {}) },
    });
    return res.data;
  },

  async getById(id: string): Promise<Profile> {
    const res = await apiClient.get<{ profile: Profile }>(
      `/api/profiles/${id}`,
    );
    return res.data.profile;
  },
};
