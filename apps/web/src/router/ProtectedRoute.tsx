import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser, selectAuthStatus } from "@/store/auth.slice";

export default function ProtectedRoute() {
  const user = useAppSelector(selectAuthUser);
  const status = useAppSelector(selectAuthStatus);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return <Outlet />;
}
