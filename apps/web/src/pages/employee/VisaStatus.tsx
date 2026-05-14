import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { profileService } from "@/services/profile.service";
import {
  documentService,
  type DocumentRecord,
} from "@/services/document.service";
import { DocUpload } from "@/components/DocUpload";
import {
  OPT_CHAIN,
  OPT_STEP_LABELS,
  type OptStep,
} from "@/services/visaStatus.service";
import type { Profile } from "shared";

// ── Step state ────────────────────────────────────────────────────────────────

type StepState = "locked" | "available" | "pending" | "approved" | "rejected";

interface StepInfo {
  step: OptStep;
  label: string;
  state: StepState;
  doc: DocumentRecord | null;
}

function buildSteps(docs: DocumentRecord[]): StepInfo[] {
  const docMap: Partial<Record<OptStep, DocumentRecord>> = {};
  for (const d of docs) {
    if (OPT_CHAIN.includes(d.type as OptStep) && !docMap[d.type as OptStep]) {
      docMap[d.type as OptStep] = d;
    }
  }
  return OPT_CHAIN.map((step, idx) => {
    const doc = docMap[step] ?? null;
    const prevStep = idx > 0 ? OPT_CHAIN[idx - 1] : null;
    const prevApproved = prevStep
      ? docMap[prevStep]?.status === "approved"
      : true;

    let state: StepState;
    if (!prevApproved) state = "locked";
    else if (!doc) state = "available";
    else if (doc.status === "rejected") state = "rejected";
    else state = doc.status as "pending" | "approved";

    return { step, label: OPT_STEP_LABELS[step], state, doc };
  });
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({
  info,
  onUploaded,
}: {
  info: StepInfo;
  onUploaded: () => void;
}) {
  const { label, state, doc, step } = info;
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      await documentService.upload(pendingFile, step, "visa");
      setPendingFile(null);
      onUploaded();
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const icons: Record<StepState, React.ReactNode> = {
    approved: <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />,
    pending: <Clock className="w-5 h-5 text-on-surface-variant shrink-0" />,
    rejected: <XCircle className="w-5 h-5 text-destructive shrink-0" />,
    available: (
      <div className="w-5 h-5 rounded-full border-2 border-primary shrink-0" />
    ),
    locked: <Lock className="w-5 h-5 text-on-surface-variant shrink-0" />,
  };

  return (
    <div
      className={`rounded-lg border p-5 flex flex-col gap-3 ${
        state === "locked"
          ? "border-border bg-surface-container-low opacity-60"
          : "border-border bg-card"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {icons[state]}
        <div className="flex-1">
          <p
            className={`text-label-md font-medium ${state === "locked" ? "text-on-surface-variant" : "text-on-surface"}`}
          >
            {label}
          </p>
          {state === "approved" && doc && (
            <a
              href={`/api/documents/${doc._id}/file`}
              target="_blank"
              rel="noreferrer"
              className="text-label-sm text-primary hover:underline"
            >
              {doc.filename}
            </a>
          )}
          {state === "pending" && (
            <p className="text-label-sm text-on-surface-variant">
              Under HR review
            </p>
          )}
          {state === "locked" && (
            <p className="text-label-sm text-on-surface-variant">
              Complete the previous step first
            </p>
          )}
        </div>
      </div>

      {/* Rejection feedback */}
      {state === "rejected" && doc?.feedback && (
        <div className="rounded-md bg-error-container/30 border border-error-container px-4 py-3">
          <p className="text-label-sm text-on-error-container font-medium mb-0.5">
            Rejection feedback
          </p>
          <p className="text-body-sm text-on-error-container">{doc.feedback}</p>
        </div>
      )}

      {(state === "available" || state === "rejected") && step === "i983" && (
        <div className="flex flex-col gap-2">
          <p className="text-label-md">Templates</p>
          <div className="flex flex-col gap-1">
            <a
              href="/api/documents/i983/templates/empty"
              target="_blank"
              rel="noreferrer"
              className="text-label-sm text-primary hover:underline"
            >
              Empty I-983
            </a>
            <a
              href="/api/documents/i983/templates/sample"
              target="_blank"
              rel="noreferrer"
              className="text-label-sm text-primary hover:underline"
            >
              Sample I-983
            </a>
          </div>
        </div>
      )}

      {(state === "available" || state === "rejected") && (
        <>
          <DocUpload
            docType={step}
            category="visa"
            label={state === "rejected" ? "Upload a new file" : "Upload file"}
            onFileChange={setPendingFile}
          />
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
          {pendingFile && (
            <Button
              type="button"
              size="sm"
              disabled={uploading}
              onClick={handleSubmit}
              className="self-start gap-2"
            >
              {uploading ? "Submitting…" : "Submit"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeVisaStatus() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, docs] = await Promise.all([
        profileService.getMyProfile(),
        documentService.getMyDocuments(),
      ]);
      setProfile(p);
      const visaDocs = docs
        .filter((d) => d.category === "visa")
        .sort(
          (a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
        );
      setSteps(buildSteps(visaDocs));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-[40rem]">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) return <p className="text-destructive">{error}</p>;
  if (profile?.workAuth?.type !== "F1-OPT") {
    return (
      <div className="flex flex-col gap-8 max-w-[48rem] mx-auto">
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-container">
            <CheckCircle2 className="w-7 h-7 text-on-primary-container" />
          </div>
          <p className="text-h3 text-on-surface">You're all set</p>
          <p className="text-body-sm text-on-surface-variant">
            No visa documentation is required for your work authorization
            status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-[48rem] mx-auto">
      <div>
        <h1 className="text-h1 text-on-surface">Visa Status</h1>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Complete each step in order. HR will review each document before you
          can proceed.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {steps.map((info) => (
          <StepCard key={info.step} info={info} onUploaded={load} />
        ))}
      </div>
    </div>
  );
}
