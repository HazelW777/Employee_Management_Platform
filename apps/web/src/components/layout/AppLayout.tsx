import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import PageLoader from "./PageLoader";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <main
        className={`flex-1 min-w-0 overflow-y-auto p-6 ${!collapsed ? "hidden md:block" : ""}`}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
