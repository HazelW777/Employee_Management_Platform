import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Mail,
  ClipboardList,
  UserCircle,
  FileText,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutThunk, selectAuthUser } from "@/store/auth.slice";

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  roles: ("hr" | "employee")[];
  href?: string;
  children?: SubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    icon: LayoutDashboard,
    href: "/hr/home",
    roles: ["hr"],
  },
  {
    label: "Home",
    icon: LayoutDashboard,
    href: "/employee/home",
    roles: ["employee"],
  },
  {
    label: "Employees",
    icon: Users,
    href: "/hr/employees",
    roles: ["hr"],
  },
  {
    label: "Visa Status",
    icon: ClipboardList,
    href: "/hr/visa-status",
    roles: ["hr"],
  },
  {
    label: "Hiring",
    icon: Mail,
    roles: ["hr"],
    children: [
      { label: "Invitations", href: "/hr/invitations" },
      { label: "Applications", href: "/hr/applications" },
    ],
  },
  {
    label: "My Profile",
    icon: UserCircle,
    href: "/employee/profile",
    roles: ["employee"],
  },
  {
    label: "Visa Status",
    icon: FileText,
    href: "/employee/visa-status",
    roles: ["employee"],
  },
];

const ROLE_LABEL: Record<string, string> = {
  hr: "HR Manager",
  employee: "Employee",
};

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role),
  );

  const avatarInitial = ROLE_LABEL[user.role]?.[0] ?? "U";

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  function handleNavClick() {
    if (window.innerWidth < 768) onCollapse(true);
  }

  const baseLink = (active: boolean) =>
    `flex items-center rounded-lg text-body-sm transition-colors ${
      active
        ? "bg-primary-container text-on-primary-container font-medium"
        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
    }`;

  return (
    <aside
      className={`
        flex flex-col bg-surface-container-low border-r border-border shrink-0
        transition-[width] duration-200 overflow-hidden
        ${collapsed ? "w-16" : "w-full md:w-48"}
      `}
    >
      {/* Brand */}
      <div className="flex items-center h-16 px-3 gap-2 shrink-0">
        {!collapsed && (
          <span className="text-h3 text-on-surface truncate flex-1 pl-2">
            Chuwa
          </span>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shrink-0 ${
            collapsed ? "mx-auto" : "ml-auto"
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1 px-2 py-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const { label, icon: Icon } = item;

          // ── Item with children ──────────────────────────────────────────────
          if (item.children) {
            const isOpen = openGroups.has(label);
            const anyChildActive = item.children.some(
              (c) => pathname === c.href,
            );

            return (
              <div key={label}>
                <button
                  onClick={() => !collapsed && toggleGroup(label)}
                  title={collapsed ? label : undefined}
                  className={`w-full ${baseLink(anyChildActive && collapsed)} ${
                    collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                  } ${!collapsed && anyChildActive ? "text-on-surface font-medium" : ""}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{label}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {!collapsed && isOpen && (
                  <div className="flex flex-col gap-0.5 mt-0.5 ml-4 pl-3 border-l border-border">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={handleNavClick}
                          className={`${baseLink(childActive)} px-3 py-2`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Regular item ────────────────────────────────────────────────────
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href!}
              title={collapsed ? label : undefined}
              onClick={handleNavClick}
              className={`${baseLink(active)} ${
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* User account */}
      <div className="px-2 py-4 space-y-1 shrink-0">
        <div
          className={`flex items-center rounded-lg px-2 py-2 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container text-label-md font-medium shrink-0">
            {avatarInitial}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-label-md text-on-surface truncate">
                {user.username}
              </span>
              <span className="text-label-sm text-on-surface-variant capitalize">
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          )}
        </div>

        <button
          title={collapsed ? "Sign out" : undefined}
          onClick={async () => {
            await dispatch(logoutThunk());
            navigate("/");
          }}
          className={`flex items-center w-full rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors ${
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}
