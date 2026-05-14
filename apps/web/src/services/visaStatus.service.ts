import { OPT_CHAIN, OPT_STEP_LABELS, type OptStep } from "shared";
import apiClient from "@/lib/api";

export type { OptStep };
export { OPT_CHAIN, OPT_STEP_LABELS };

export type DocStatus = "pending" | "approved" | "rejected";

export interface VisaDocEntry {
  docId: string;
  filename: string;
  status: DocStatus;
  feedback?: string;
}

export interface EmployeeVisaStatus {
  userId: string;
  username: string;
  fullName: string | null;
  lastName: string | null;
  email: string;
  docs: Partial<Record<OptStep, VisaDocEntry>>;
  nextStep: string | null;
  nextStepType: OptStep | null;
  currentDocId: string | null;
  canNotify: boolean;
  workAuthStartDate: string | null;
  workAuthEndDate: string | null;
}

export const visaStatusService = {
  async getAll(): Promise<EmployeeVisaStatus[]> {
    const res = await apiClient.get<{ employees: EmployeeVisaStatus[] }>(
      "/api/hr/visa-status",
    );
    return res.data.employees;
  },

  async notify(userId: string): Promise<void> {
    await apiClient.post(`/api/hr/visa-status/${userId}/notify`);
  },
};
