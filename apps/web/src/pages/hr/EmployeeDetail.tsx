import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { type Profile, OPT_CHAIN, OPT_STEP_LABELS, type OptStep } from "shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { profileService } from "@/services/profile.service";
import { documentService, type DocumentRecord } from "@/services/document.service";
import { getFullName } from "./Employees";

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
    <div className={`flex flex-col gap-0.5`}>
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

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allDocs, setAllDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    profileService
      .getById(id)
      .then((p) => {
        setProfile(p);
        const userId =
          typeof p.user === "string"
            ? p.user
            : (p.user as unknown as { _id: string })._id;
        return documentService.getAllDocsByUser(userId);
      })
      .then(setAllDocs)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-[48rem]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-destructive">{error ?? "Profile not found."}</p>
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
          <h1 className="text-h1 text-on-surface">{getFullName(profile)}</h1>
        </div>
        <p className="text-body-sm text-on-surface-variant">{profile.email}</p>
        <p className="text-body-sm text-on-surface-variant">
          Last Updated: {formatDate(profile.updatedAt)}
        </p>
      </div>

      {/* Personal Information */}
      <Section title="Personal Information">
        <ProfileAvatar docId={profile.profilePictureDocId} />
        <Row>
          <Field label="First name" value={profile.firstName} />
          <Field label="Last name" value={profile.lastName} />
        </Row>
        <Row>
          <Field label="Middle name" value={profile.middleName} />
          <Field label="Preferred name" value={profile.preferredName} />
        </Row>
        <Row>
          <Field label="SSN" value={profile.ssn} />
          <Field label="Date of birth" value={formatDate(profile.dob)} />
        </Row>
        <Row>
          <Field
            label="Gender"
            value={
              profile.gender === "male"
                ? "Male"
                : profile.gender === "female"
                  ? "Female"
                  : "Prefer not to say"
            }
          />
        </Row>
      </Section>

      {/* Address */}
      <Section title="Address">
        <Field label="Address line 1" value={profile.address?.addressLine1} />
        <Field label="Address line 2" value={profile.address?.addressLine2} />
        <Row>
          <Field label="City" value={profile.address?.city} />
          <Field label="State" value={profile.address?.state} />
        </Row>
        <Field label="ZIP code" value={profile.address?.zip} />
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <Row>
          <Field label="Cell phone" value={profile.cellPhone} />
          <Field label="Work phone" value={profile.workPhone} />
        </Row>
      </Section>

      {/* Citizenship */}
      <Section title="Citizenship & Work Authorization">
        <Field
          label="US citizen or permanent resident"
          value={
            profile.citizenship?.isPermanentResidentOrCitizen ? "Yes" : "No"
          }
        />
        {profile.citizenship?.isPermanentResidentOrCitizen ? (
          <Field
            label="Status"
            value={
              profile.citizenship.type === "citizen"
                ? "Citizen"
                : profile.citizenship.type === "green_card"
                  ? "Green card"
                  : null
            }
          />
        ) : (
          <>
            <Field label="Visa type" value={profile.workAuth?.type} />
            {profile.workAuth?.type === "other" && (
              <Field label="Visa title" value={profile.workAuth.otherTitle} />
            )}
            <Row>
              <Field
                label="Start date"
                value={formatDate(profile.workAuth?.startDate)}
              />
              <Field
                label="End date"
                value={formatDate(profile.workAuth?.endDate)}
              />
            </Row>
          </>
        )}
      </Section>

      {/* Reference */}
      {profile.reference?.firstName && (
        <Section title="Reference Contact">
          <Row>
            <Field label="First name" value={profile.reference.firstName} />
            <Field label="Last name" value={profile.reference.lastName} />
          </Row>
          <Row>
            <Field label="Phone" value={profile.reference.phone} />
            <Field label="Email" value={profile.reference.email} />
          </Row>
          <Field label="Relationship" value={profile.reference.relationship} />
        </Section>
      )}

      {/* Emergency Contacts */}
      {profile.emergencyContacts?.length > 0 && (
        <Section title="Emergency Contacts">
          {profile.emergencyContacts.map((c, i) => (
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
        {(() => {
          const dlDoc = allDocs.find((d) => d.type === "drivers_license");
          return (
            <DocRow
              docId={dlDoc?._id}
              label="Driver's license"
              filename={dlDoc?.filename}
            />
          );
        })()}
        {OPT_CHAIN.map((step) => {
          const doc = allDocs
            .filter((d) => d.type === step && d.status === "approved")
            .sort(
              (a, b) =>
                new Date(b.uploadedAt).getTime() -
                new Date(a.uploadedAt).getTime(),
            )[0] as DocumentRecord | undefined;
          if (!doc) return null;
          return (
            <DocRow
              key={step}
              docId={doc._id}
              label={OPT_STEP_LABELS[step as OptStep]}
              filename={doc.filename}
            />
          );
        })}
      </Section>
    </div>
  );
}
