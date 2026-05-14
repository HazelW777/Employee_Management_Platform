import { type DocumentRecord, type DocType, type DocCategory } from "shared";
import apiClient from "@/lib/api";

export type { DocumentRecord, DocType, DocCategory };

export const documentService = {
  async upload(file: File, type: DocType, category: DocCategory): Promise<DocumentRecord> {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    form.append("category", category);
    const res = await apiClient.post<{ document: DocumentRecord }>(
      "/api/documents",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data.document;
  },

  async getMyDocuments(): Promise<DocumentRecord[]> {
    const res = await apiClient.get<{ documents: DocumentRecord[] }>("/api/documents/me");
    return res.data.documents;
  },

  async getById(id: string): Promise<DocumentRecord> {
    const res = await apiClient.get<{ document: DocumentRecord }>(`/api/documents/${id}`);
    return res.data.document;
  },

  async review(
    id: string,
    status: "approved" | "rejected",
    feedback?: string,
  ): Promise<void> {
    await apiClient.patch(`/api/documents/${id}/review`, { status, feedback });
  },

  async getAllDocsByUser(userId: string): Promise<DocumentRecord[]> {
    const res = await apiClient.get<{ documents: DocumentRecord[] }>(
      `/api/documents?user=${userId}`,
    );
    return res.data.documents;
  },

  // Returns a blob URL for displaying the file in the browser
  async getFileUrl(id: string): Promise<string> {
    const res = await apiClient.get(`/api/documents/${id}/file`, {
      responseType: "blob",
    });
    return URL.createObjectURL(res.data as Blob);
  },
};
