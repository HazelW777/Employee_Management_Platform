import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/auth.slice";

/**
 * For employee routes that require an approved profile.
 * - No profile → redirect to /onboarding (application still pending/not submitted)
 * - Has profile → allow through
 */
export function RequireProfile() {
  const user = useAppSelector(selectAuthUser);
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "employee" && !user.profile)
    return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/**
 * Onboarding page itself.
 * - No profile → show onboarding (stay here)
 * - Has profile → already approved, redirect to home
 */
export function OnboardingRoute() {
  const user = useAppSelector(selectAuthUser);
  if (!user) return <Navigate to="/" replace />;
  if (user.profile) return <Navigate to="/employee/home" replace />;
  return <Outlet />;
}
