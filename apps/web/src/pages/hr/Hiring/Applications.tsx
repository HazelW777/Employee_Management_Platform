import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { type Application, type ApplicationStatus } from "shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { applicationService } from "@/services/application.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getFullName(app: Application) {
  return [
    app.snapshot.firstName,
    app.snapshot.middleName,
    app.snapshot.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: "bg-secondary-container text-on-secondary-container",
  approved: "bg-primary-container text-on-primary-container",
  rejected: "bg-error-container text-on-error-container",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const TABS: { label: string; status: ApplicationStatus }[] = [
  { label: "Pending", status: "pending" },
  { label: "Approved", status: "approved" },
  { label: "Rejected", status: "rejected" },
];

export default function Applications() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] =
    useState<ApplicationStatus>("pending");
  const [apps, setApps] = useState<Application[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    applicationService
      .getAll(page, PAGE_SIZE, activeStatus)
      .then((data) => {
        if (cancelled) return;
        setApps(data.applications);
        setTotalPages(data.pagination.pages);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, activeStatus]);

  function handleTabChange(status: ApplicationStatus) {
    setActiveStatus(status);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-on-surface">Applications</h1>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border px-4 gap-1">
          {TABS.map(({ label, status }) => (
            <Tab
              key={status}
              label={label}
              active={activeStatus === status}
              onClick={() => handleTabChange(status)}
            />
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low">
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Submitted
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-destructive"
                  >
                    {error}
                  </td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container">
                        <FileText className="w-6 h-6 text-on-surface-variant" />
                      </div>
                      <p className="text-body-md text-on-surface-variant">
                        No {activeStatus} applications
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr
                    key={app._id}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-4 py-2 text-on-surface font-medium">
                      {getFullName(app)}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {app.snapshot.email}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/hr/applications/${app._id}`)}
                        className="text-primary hover:text-primary"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-container-low">
            <p className="text-label-sm text-on-surface-variant">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
