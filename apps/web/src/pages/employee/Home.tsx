import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/auth.slice";

export default function EmployeeHome() {
  const user = useAppSelector(selectAuthUser);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-h1 text-on-surface">
        Welcome back, {user?.username}
      </h1>
      <p className="text-body-md text-on-surface-variant">
        Here's what's happening in your organisation today.
      </p>
    </div>
  );
}
