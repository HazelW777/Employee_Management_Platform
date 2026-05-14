import { useEffect, useState } from "react";
import { ShieldCheck, X, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import {
  visaStatusService,
  OPT_CHAIN,
  OPT_STEP_LABELS,
  type EmployeeVisaStatus,
  type OptStep,
} from "@/services/visaStatus.service";
import { documentService } from "@/services/document.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysRemaining(iso?: string | null): { text: string; urgent: boolean } {
  if (!iso) return { text: "—", urgent: false };
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return { text: "Expired", urgent: true };
  if (diff === 0) return { text: "Today", urgent: true };
  return { text: `${diff}d`, urgent: diff <= 30 };
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

// ── Document review modal ─────────────────────────────────────────────────────

function ReviewModal({
  emp,
  onClose,
  onReviewed,
}: {
  emp: EmployeeVisaStatus;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docId = emp.currentDocId!;
  const stepLabel = emp.nextStepType
    ? OPT_STEP_LABELS[emp.nextStepType]
    : "Document";

  async function handleAction(status: "approved" | "rejected") {
    setLoading(true);
    setError(null);
    try {
      await documentService.review(docId, status, feedback.trim() || undefined);
      onReviewed();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div
        className="bg-card flex flex-col w-full h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-label-md text-on-surface font-medium">
              Review: {stepLabel} | {emp.fullName ?? emp.username}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document preview */}
        <div className="flex-1 min-h-0 bg-surface-container">
          <iframe
            src={`/api/documents/${docId}/file`}
            title={stepLabel}
            className="w-full h-full border-0"
          />
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-border flex flex-col gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {rejecting ? (
            <>
              <label className="text-label-md text-on-surface font-medium">
                Rejection feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain why the document is being rejected…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => {
                    setRejecting(false);
                    setFeedback("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={loading}
                  onClick={() => handleAction("rejected")}
                >
                  <X className="w-4 h-4" />
                  {loading ? "Rejecting…" : "Confirm Reject"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-destructive border-destructive hover:bg-destructive/10"
                disabled={loading}
                onClick={() => setRejecting(true)}
              >
                <X className="w-4 h-4" /> Reject
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={loading}
                onClick={() => handleAction("approved")}
              >
                <Check className="w-4 h-4" />
                {loading ? "Approving…" : "Approve"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── In Progress table ─────────────────────────────────────────────────────────

function InProgressTable({
  rows,
  loading,
  error,
  onRefresh,
}: {
  rows: EmployeeVisaStatus[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [notifying, setNotifying] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<EmployeeVisaStatus | null>(null);

  async function handleNotify(userId: string) {
    setNotifying(userId);
    try {
      await visaStatusService.notify(userId);
    } finally {
      setNotifying(null);
    }
  }

  const COL = 7;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-body-sm">
          <colgroup>
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-36" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-container-low">
              {[
                "Name",
                "Current Step",
                "Start Date",
                "End Date",
                "Days Left",
                "Next Step",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: COL }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={COL}
                  className="px-4 py-10 text-center text-destructive"
                >
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COL} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container">
                      <ShieldCheck className="w-6 h-6 text-on-surface-variant" />
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      All employees are up to date
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((emp) => {
                const days = daysRemaining(emp.workAuthEndDate);
                const currentLabel = emp.nextStepType
                  ? OPT_STEP_LABELS[emp.nextStepType]
                  : "—";
                const hasPendingDoc =
                  emp.currentDocId &&
                  emp.docs[emp.nextStepType!]?.status === "pending";

                return (
                  <tr
                    key={emp.userId}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-4 py-2 text-on-surface-variant truncate">
                      {emp.fullName ?? emp.username}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant truncate">
                      {currentLabel}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant whitespace-nowrap">
                      {formatDate(emp.workAuthStartDate)}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant whitespace-nowrap">
                      {formatDate(emp.workAuthEndDate)}
                    </td>
                    <td
                      className={`px-4 py-2 font-medium whitespace-nowrap ${days.urgent ? "text-destructive" : "text-on-surface-variant"}`}
                    >
                      {days.text}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant truncate">
                      {(() => {
                        const idx = emp.nextStepType
                          ? OPT_CHAIN.indexOf(emp.nextStepType)
                          : -1;
                        const after =
                          idx >= 0 && idx < OPT_CHAIN.length - 1
                            ? OPT_CHAIN[idx + 1]
                            : null;
                        return after ? OPT_STEP_LABELS[after] : "—";
                      })()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPendingDoc && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary"
                            onClick={() => setReviewing(emp)}
                          >
                            View
                          </Button>
                        )}
                        {emp.canNotify && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={notifying === emp.userId}
                            onClick={() => handleNotify(emp.userId)}
                            className="text-primary hover:text-primary"
                          >
                            {notifying === emp.userId ? "Sending…" : "Notify"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {reviewing && (
        <ReviewModal
          emp={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={onRefresh}
        />
      )}
    </>
  );
}

// ── All table ─────────────────────────────────────────────────────────────────

function AllTable({
  rows,
  loading,
  error,
}: {
  rows: EmployeeVisaStatus[];
  loading: boolean;
  error: string | null;
}) {
  const COL = 4 + OPT_CHAIN.length; // name + start + end + days + 4 steps

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-body-sm">
        <colgroup>
          <col className="w-36" />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-28" />
          {OPT_CHAIN.map((step) => (
            <col key={step} className="w-36" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-surface-container-low">
            {["Name", "Start Date", "End Date", "Days Left"].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium whitespace-nowrap"
              >
                {h}
              </th>
            ))}
            {OPT_CHAIN.map((step) => (
              <th
                key={step}
                className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium whitespace-nowrap"
              >
                {OPT_STEP_LABELS[step as OptStep]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: COL }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : error ? (
            <tr>
              <td
                colSpan={COL}
                className="px-4 py-10 text-center text-destructive"
              >
                {error}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COL} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container">
                    <ShieldCheck className="w-6 h-6 text-on-surface-variant" />
                  </div>
                  <p className="text-body-md text-on-surface-variant">
                    No records found
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((emp) => {
              const days = daysRemaining(emp.workAuthEndDate);
              return (
                <tr
                  key={emp.userId}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <td className="px-4 py-4 text-on-surface-variant truncate">
                    {emp.fullName ?? emp.username}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatDate(emp.workAuthStartDate)}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    {formatDate(emp.workAuthEndDate)}
                  </td>
                  <td
                    className={`px-4 py-4 font-medium whitespace-nowrap ${days.urgent ? "text-destructive" : "text-on-surface-variant"}`}
                  >
                    {days.text}
                  </td>
                  {OPT_CHAIN.map((step) => {
                    const doc = emp.docs[step as OptStep];
                    const hasFile =
                      doc && doc.status !== "rejected" && doc.docId;
                    const displayName =
                      doc?.filename || OPT_STEP_LABELS[step as OptStep];
                    return (
                      <td key={step} className="px-4 py-4">
                        {hasFile ? (
                          <a
                            href={`/api/documents/${doc.docId}/file`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-label-sm truncate block"
                            title={displayName}
                          >
                            {displayName}
                          </a>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabValue = "in_progress" | "all";

const TABS: { label: string; value: TabValue }[] = [
  { label: "In Progress", value: "in_progress" },
  { label: "All", value: "all" },
];

export default function VisaStatus() {
  const [employees, setEmployees] = useState<EmployeeVisaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>("in_progress");
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    visaStatusService
      .getAll()
      .then(setEmployees)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = search.trim()
    ? employees.filter((e) =>
        (e.fullName ?? e.username)
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : employees;
  const inProgress = filtered.filter((e) => e.nextStep !== null);
  const rows = tab === "all" ? filtered : inProgress;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-on-surface">Visa Status</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-body-sm ring-offset-background placeholder:text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex border-b border-border px-4 gap-1">
          {TABS.map(({ label, value }) => (
            <Tab
              key={value}
              label={label}
              active={tab === value}
              onClick={() => setTab(value)}
            />
          ))}
        </div>

        {tab === "in_progress" ? (
          <InProgressTable
            rows={rows}
            loading={loading}
            error={error}
            onRefresh={load}
          />
        ) : (
          <AllTable rows={rows} loading={loading} error={error} />
        )}
      </div>
    </div>
  );
}
