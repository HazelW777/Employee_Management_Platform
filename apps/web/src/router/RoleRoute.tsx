import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/auth.slice";

const HOME_BY_ROLE: Record<string, string> = {
  hr: "/hr/home",
  employee: "/employee/home",
};

interface Props {
  roles: ("hr" | "employee")[];
}

export default function RoleRoute({ roles }: Props) {
  const user = useAppSelector(selectAuthUser);

  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role))
    return <Navigate to={HOME_BY_ROLE[user.role] ?? "/"} replace />;

  return <Outlet />;
}
