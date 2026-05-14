import axios from "axios";

import { store } from "@/store";
import { clearAuth } from "@/store/auth.slice";
import { setGlobalError } from "@/store/app.slice";

const apiClient = axios.create({
  baseURL: "/",
  withCredentials: true,
});

// Auto-clear auth state when the BE says our session is no longer valid.
// Skip /auth/login because a 401 there means "wrong credentials", not
// "session expired" — and we want the form's error message to survive.
const SERVER_DOWN_STATUSES = [502, 503, 504];

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const isLoginRequest = err.config?.url?.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      store.dispatch(clearAuth());
    }

    // No response at all (ECONNREFUSED) or proxy gateway errors → server is down
    if (!err.response || SERVER_DOWN_STATUSES.includes(status)) {
      store.dispatch(
        setGlobalError("The server is currently unavailable. Please try again later."),
      );
    }

    return Promise.reject(err);
  },
);

// Generic BE error message extractor. The server's errorHandler middleware
// always responds with { status: "error", message: "..." }, so this works
// for every service — auth, user, document, etc.
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (typeof obj.message === "string" && obj.message) return obj.message;
      if (typeof obj.error === "string" && obj.error) return obj.error;
    }

    if (typeof data === "string" && data) return data;

    if (!err.response)
      return "Unable to reach the server. Check your connection.";

    return "Something went wrong. Please try again.";
  }
  return "An unexpected error occurred";
}

export default apiClient;
