import { lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ResetPassword from "./pages/auth/ResetPassword";
import ErrorPage from "./pages/ErrorPage";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./router/ProtectedRoute";
import RoleRoute from "./router/RoleRoute";
import { OnboardingRoute, RequireProfile } from "./router/OnboardingGate";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { getMeThunk, selectAuthInitialized } from "./store/auth.slice";
import { clearGlobalError, selectGlobalError } from "./store/app.slice";

// HR pages
const HrHome = lazy(() => import("./pages/hr/Home"));
const Invitations = lazy(() => import("./pages/hr/Hiring/Invitations"));
const Application = lazy(() => import("./pages/hr/Hiring/Applications"));
const ApplicationDetail = lazy(
  () => import("./pages/hr/Hiring/ApplicationDetail"),
);
const VisaStatus = lazy(() => import("./pages/hr/VisaStatus"));
const Employees = lazy(() => import("./pages/hr/Employees"));
const EmployeeDetail = lazy(() => import("./pages/hr/EmployeeDetail"));

// Employee pages
const EmployeeHome = lazy(() => import("./pages/employee/Home"));
const Onboarding = lazy(() => import("./pages/employee/Onboarding"));
const MyProfile = lazy(() => import("./pages/employee/MyProfile"));
const EmployeeVisaStatus = lazy(() => import("./pages/employee/VisaStatus"));

export default function App() {
  const dispatch = useAppDispatch();
  const globalError = useAppSelector(selectGlobalError);
  const initialized = useAppSelector(selectAuthInitialized);

  useEffect(() => {
    dispatch(getMeThunk());
  }, [dispatch]);

  if (globalError) {
    return <ErrorPage onReset={() => dispatch(clearGlobalError())} />;
  }

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          {/* Onboarding — employee with no profile only */}
          <Route element={<OnboardingRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>

          {/* Main app — employees must have an approved profile */}
          <Route element={<RequireProfile />}>
            <Route element={<AppLayout />}>
              {/* HR only */}
              <Route element={<RoleRoute roles={["hr"]} />}>
                <Route path="/hr/home" element={<HrHome />} />
                <Route path="/hr/invitations" element={<Invitations />} />
                <Route path="/hr/applications" element={<Application />} />
                <Route
                  path="/hr/applications/:id"
                  element={<ApplicationDetail />}
                />
                <Route path="/hr/employees" element={<Employees />} />
                <Route path="/hr/employees/:id" element={<EmployeeDetail />} />
                <Route path="/hr/visa-status" element={<VisaStatus />} />
              </Route>

              {/* Employee only */}
              <Route element={<RoleRoute roles={["employee"]} />}>
                <Route path="/employee/home" element={<EmployeeHome />} />
                <Route path="/employee/profile" element={<MyProfile />} />
                <Route
                  path="/employee/visa-status"
                  element={<EmployeeVisaStatus />}
                />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
