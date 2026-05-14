import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, X, User } from "lucide-react";
import { type Application, type ApplicationWithDocs } from "shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { applicationService } from "@/services/application.service";
import { documentService } from "@/services/document.service";
import { getFullName, StatusBadge } from "./Applications";

// ── Layout helpers ───────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-h3 text-on-surface border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value || "—"}</p>
    </div>
  );
}

function formatDate(v?: string | Date | null) {
  if (!v) return null;
  return new Date(v).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ── Profile avatar ────────────────────────────────────────────────────────────

function ProfileAvatar({ docId }: { docId?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) return;
    let url: string;
    documentService
      .getFileUrl(docId)
      .then((u) => {
        url = u;
        setSrc(u);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [docId]);

  return (
    <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-container border border-border flex items-center justify-center shrink-0">
      {src ? (
        <img src={src} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <User className="w-8 h-8 text-on-surface-variant" />
      )}
    </div>
  );
}

// ── Document link row ─────────────────────────────────────────────────────────

function DocRow({
  docId,
  label,
  filename,
}: {
  docId?: string;
  label: string;
  filename?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label-md text-on-surface font-medium">{label}</p>
      {!docId && (
        <p className="text-body-sm text-on-surface-variant">No file</p>
      )}
      {docId && (
        <div className="flex items-center gap-3">
          <a
            href={`/api/documents/${docId}/file`}
            target="_blank"
            rel="noreferrer"
            className="text-body-sm text-primary hover:underline truncate"
            title={filename}
          >
            {filename ?? label}
          </a>
          <a
            href={`/api/documents/${docId}/file`}
            download={filename ?? label}
            className="shrink-0"
          >
            <Button type="button" variant="outline" size="sm">
              Download
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [app, setApp] = useState<Application | null>(null);
  const [appDocs, setAppDocs] = useState<ApplicationWithDocs["documents"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    applicationService
      .getById(id)
      .then(({ application, documents }) => {
        setApp(application);
        setAppDocs(documents);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    if (!id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await applicationService.review(id, { status: "approved" });
      navigate("/hr/applications");
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await applicationService.review(id, {
        status: "rejected",
        feedback: feedback.trim() || undefined,
      });
      navigate(-1);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-[48rem]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-destructive">{error ?? "Application not found."}</p>
        <Button
          variant="outline"
          className="self-start"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>
    );
  }

  const s = app.snapshot;

  return (
    <div className="flex flex-col gap-8 w-full max-w-[48rem] mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-on-surface self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-h1 text-on-surface">{getFullName(app)}</h1>
          <StatusBadge status={app.status} />
        </div>
        <p className="text-body-sm text-on-surface-variant">{s.email}</p>
      </div>

      {/* Rejection feedback */}
      {app.status === "rejected" && app.feedback && (
        <div className="rounded-lg border border-error-container bg-error-container/20 p-4">
          <p className="text-label-sm text-on-error-container font-medium mb-1">
            Rejection feedback
          </p>
          <p className="text-body-sm text-on-error-container">{app.feedback}</p>
        </div>
      )}

      {/* Personal Information */}
      <Section title="Personal Information">
        <ProfileAvatar docId={s.profilePictureDocId} />
        <Row>
          <Field label="First name" value={s.firstName} />
          <Field label="Last name" value={s.lastName} />
        </Row>
        <Row>
          <Field label="Middle name" value={s.middleName} />
          <Field label="Preferred name" value={s.preferredName} />
        </Row>
        <Row>
          <Field label="SSN" value={s.ssn} />
          <Field label="Date of birth" value={formatDate(s.dob)} />
        </Row>
        <Row>
          <Field
            label="Gender"
            value={
              s.gender === "male"
                ? "Male"
                : s.gender === "female"
                  ? "Female"
                  : "Prefer not to say"
            }
          />
        </Row>
      </Section>

      {/* Address */}
      <Section title="Address">
        <Field label="Address line 1" value={s.address?.addressLine1} />
        <Field label="Address line 2" value={s.address?.addressLine2} />
        <Row>
          <Field label="City" value={s.address?.city} />
          <Field label="State" value={s.address?.state} />
        </Row>
        <Field label="ZIP code" value={s.address?.zip} />
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <Row>
          <Field label="Cell phone" value={s.cellPhone} />
          <Field label="Work phone" value={s.workPhone} />
        </Row>
      </Section>

      {/* Citizenship */}
      <Section title="Citizenship & Work Authorization">
        <Field
          label="US citizen or permanent resident"
          value={s.citizenship?.isPermanentResidentOrCitizen ? "Yes" : "No"}
        />
        {s.citizenship?.isPermanentResidentOrCitizen ? (
          <Field
            label="Status"
            value={
              s.citizenship.type === "citizen"
                ? "Citizen"
                : s.citizenship.type === "green_card"
                  ? "Green card"
                  : null
            }
          />
        ) : (
          <>
            <Field label="Visa type" value={s.workAuth?.type} />
            {s.workAuth?.type === "other" && (
              <Field label="Visa title" value={s.workAuth.otherTitle} />
            )}
            <Row>
              <Field
                label="Start date"
                value={formatDate(s.workAuth?.startDate)}
              />
              <Field label="End date" value={formatDate(s.workAuth?.endDate)} />
            </Row>
          </>
        )}
      </Section>

      {/* Reference */}
      {s.reference?.firstName && (
        <Section title="Reference Contact">
          <Row>
            <Field label="First name" value={s.reference.firstName} />
            <Field label="Last name" value={s.reference.lastName} />
          </Row>
          <Row>
            <Field label="Phone" value={s.reference.phone} />
            <Field label="Email" value={s.reference.email} />
          </Row>
          <Field label="Relationship" value={s.reference.relationship} />
        </Section>
      )}

      {/* Emergency Contacts */}
      {s.emergencyContacts?.length > 0 && (
        <Section title="Emergency Contacts">
          {s.emergencyContacts.map((c, i) => (
            <div key={i} className="flex flex-col gap-3">
              <p className="text-label-md text-on-surface font-medium">
                Contact {i + 1}
              </p>
              <Row>
                <Field label="First name" value={c.firstName} />
                <Field label="Last name" value={c.lastName} />
              </Row>
              <Row>
                <Field label="Phone" value={c.phone} />
                <Field label="Email" value={c.email} />
              </Row>
              <Field label="Relationship" value={c.relationship} />
            </div>
          ))}
        </Section>
      )}

      {/* Documents */}
      <Section title="Documents">
        <DocRow
          docId={s.driversLicenseDocId}
          label="Driver's license"
          filename={appDocs?.driversLicense?.filename}
        />
      </Section>

      {/* Actions — pending only */}
      {app.status === "pending" && (
        <div className="flex flex-col gap-3 pt-2">
          {actionError && (
            <p className="text-sm font-medium text-destructive">
              {actionError}
            </p>
          )}
          {rejecting ? (
            <>
              <label className="text-label-md text-on-surface font-medium">
                Rejection feedback (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain why the application is being rejected…"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading}
                  onClick={() => {
                    setRejecting(false);
                    setFeedback("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                  disabled={actionLoading}
                  onClick={handleReject}
                >
                  <X className="w-4 h-4" />
                  {actionLoading ? "Rejecting…" : "Confirm Reject"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-destructive border-destructive hover:bg-destructive/10"
                disabled={actionLoading}
                onClick={() => setRejecting(true)}
              >
                <X className="w-4 h-4" /> Reject
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={actionLoading}
                onClick={handleApprove}
              >
                <Check className="w-4 h-4" />
                {actionLoading ? "Approving…" : "Approve"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
