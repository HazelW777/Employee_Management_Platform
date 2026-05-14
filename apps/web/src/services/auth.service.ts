import {
  type signinSchema,
  type signupSchema,
  type forgotPasswordSchema,
  type resetPasswordSchema,
  type changePasswordSchema,
  type AuthUser,
} from "shared";
import type { z } from "zod";
import apiClient from "@/lib/api";

// ── Input types inferred from shared schemas ──────────────────────────────────

export type SigninInput = z.infer<typeof signinSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ── Response types matching the backend ──────────────────────────────────────

export type { AuthUser } from "shared";
type UserResponse = { user: AuthUser };
type MessageResponse = { message: string };

// ── Service ───────────────────────────────────────────────────────────────────
// Data is already validated by the form layer (zodResolver) before reaching
// here, so no schema.parse() — that would throw a ZodError (not an AxiosError)
// on any edge-case mismatch, bypassing getApiErrorMessage.

export const authService = {
  async signin(data: SigninInput): Promise<UserResponse> {
    const res = await apiClient.post<UserResponse>("/api/auth/signin", data);
    return res.data;
  },

  async signup(data: SignupInput): Promise<MessageResponse> {
    const res = await apiClient.post<MessageResponse>("/api/auth/signup", data);
    return res.data;
  },

  async forgotPassword(data: ForgotPasswordInput): Promise<MessageResponse> {
    const res = await apiClient.post<MessageResponse>(
      "/api/auth/forgot-password",
      data,
    );
    return res.data;
  },

  async resetPassword(data: ResetPasswordInput): Promise<MessageResponse> {
    const res = await apiClient.post<MessageResponse>(
      "/api/auth/reset-password",
      data,
    );
    return res.data;
  },

  async changePassword(data: ChangePasswordInput): Promise<MessageResponse> {
    const res = await apiClient.post<MessageResponse>(
      "/api/auth/change-password",
      data,
    );
    return res.data;
  },

  async logout(): Promise<MessageResponse> {
    const res = await apiClient.post<MessageResponse>("/api/auth/logout");
    return res.data;
  },

  async getMe(): Promise<UserResponse> {
    const res = await apiClient.get<UserResponse>("/api/auth/me");
    return res.data;
  },

  async validateInviteToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const res = await apiClient.get<{ valid: boolean; email?: string }>(
      `/api/auth/invite/${encodeURIComponent(token)}`,
    );
    return res.data;
  },
};
