export interface AuthUser {
  id: string;
  username: string;
  role: "hr" | "employee";
  profile: string | null; // null = onboarding not yet approved
}
