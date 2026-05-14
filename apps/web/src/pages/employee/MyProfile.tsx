import { useEffect, useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  updateProfileSchema,
  type Profile,
  type Contact,
  type Gender,
  type WorkAuth,
} from "shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getApiErrorMessage } from "@/lib/api";
import {
  profileService,
  type UpdateProfileInput,
  type PatchProfileInput,
} from "@/services/profile.service";
import { DocUpload } from "@/components/DocUpload";
import { documentService } from "@/services/document.service";

// ── Form type (dates as strings) ──────────────────────────────────────────────

type FormValues = Omit<UpdateProfileInput, "dob" | "workAuth"> & {
  dob: string;
  workAuth?: Omit<
    NonNullable<UpdateProfileInput["workAuth"]>,
    "startDate" | "endDate"
  > & { startDate?: string; endDate?: string };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateInput(v: string | Date | undefined) {
  if (!v) return "";
  return new Date(v).toISOString().split("T")[0];
}

const emptyContact: Contact = {
  firstName: "",
  lastName: "",
  middleName: "",
  phone: "",
  email: "",
  relationship: "",
};

function buildFromProfile(p: Profile): FormValues {
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    middleName: p.middleName ?? "",
    preferredName: p.preferredName ?? "",
    address: {
      addressLine1: p.address?.addressLine1 ?? "",
      addressLine2: p.address?.addressLine2 ?? "",
      city: p.address?.city ?? "",
      state: p.address?.state ?? "",
      zip: p.address?.zip ?? "",
    },
    cellPhone: p.cellPhone ?? "",
    workPhone: p.workPhone ?? "",
    ssn: p.ssn ?? "",
    dob: toDateInput(p.dob),
    gender: (p.gender ?? "no_answer") as Gender,
    citizenship: {
      isPermanentResidentOrCitizen:
        p.citizenship?.isPermanentResidentOrCitizen ?? false,
      type: p.citizenship?.type,
    },
    workAuth: p.workAuth
      ? {
          type: p.workAuth.type as WorkAuth["type"],
          otherTitle: p.workAuth.otherTitle ?? "",
          startDate: toDateInput(p.workAuth.startDate),
          endDate: toDateInput(p.workAuth.endDate),
        }
      : undefined,
    reference: p.reference ? { ...p.reference } : undefined,
    emergencyContacts: p.emergencyContacts?.length
      ? p.emergencyContacts.map((c) => ({ ...emptyContact, ...c }))
      : [{ ...emptyContact }],
  };
}

// ── Layout helpers ────────────────────────────────────────────────────────────

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

function NativeSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
    </div>
  );
}

// ── Read-only avatar ──────────────────────────────────────────────────────────

function ProfileAvatarReadOnly({ docId }: { docId?: string }) {
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
        <span className="text-2xl text-on-surface-variant">👤</span>
      )}
    </div>
  );
}

// ── Read-only view ────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value || "—"}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ProfileView({ profile }: { profile: Profile }) {
  const isCitizen = profile.citizenship?.isPermanentResidentOrCitizen;

  // Always load doc IDs from the documents API — profile.*DocId is only set at
  // application approval and doesn't reflect files uploaded afterward.
  const [picId, setPicId] = useState<string | undefined>(
    profile.profilePictureDocId,
  );
  const [licenseDoc, setLicenseDoc] = useState<{
    _id: string;
    filename: string;
  } | null>(null);

  useEffect(() => {
    documentService
      .getMyDocuments()
      .then((docs) => {
        const pic = docs.find((d) => d.type === "profile_picture");
        const dl = docs.find((d) => d.type === "drivers_license");
        if (pic) setPicId(pic._id);
        if (dl) setLicenseDoc({ _id: dl._id, filename: dl.filename });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <Section title="Personal Information">
        <ProfileAvatarReadOnly docId={picId} />
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

      <Section title="Address">
        <Field label="Address line 1" value={profile.address?.addressLine1} />
        <Field label="Address line 2" value={profile.address?.addressLine2} />
        <Row>
          <Field label="City" value={profile.address?.city} />
          <Field label="State" value={profile.address?.state} />
        </Row>
        <Field label="ZIP code" value={profile.address?.zip} />
      </Section>

      <Section title="Contact">
        <Row>
          <Field label="Cell phone" value={profile.cellPhone} />
          <Field label="Work phone" value={profile.workPhone} />
        </Row>
      </Section>

      <Section title="Citizenship & Work Authorization">
        <Field
          label="US citizen or permanent resident"
          value={isCitizen ? "Yes" : "No"}
        />
        {isCitizen ? (
          <Field
            label="Status"
            value={
              profile.citizenship?.type === "citizen"
                ? "Citizen"
                : profile.citizenship?.type === "green_card"
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

      {profile.emergencyContacts?.length > 0 && (
        <Section title="Emergency Contacts">
          {profile.emergencyContacts.map((c, i) => (
            <div key={i} className="flex flex-col gap-3 ">
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

      <Section title="Documents">
        {licenseDoc ? (
          <div className="flex flex-col gap-1">
            <p className="text-label-md text-on-surface font-medium">
              Driver's license
            </p>
            <div className="flex items-center gap-3">
              <a
                href={`/api/documents/${licenseDoc._id}/file`}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary hover:underline truncate"
              >
                {licenseDoc.filename}
              </a>
              <a
                href={`/api/documents/${licenseDoc._id}/file`}
                download={licenseDoc.filename}
                className="shrink-0"
              >
                <Button type="button" variant="outline" size="sm">
                  Download
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant">No file</p>
        )}
      </Section>
    </div>
  );
}

// ── Profile form ──────────────────────────────────────────────────────────────

function ProfileForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: Profile;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showReference, setShowReference] = useState(
    !!(profile.reference?.firstName || profile.reference?.lastName),
  );
  const [picId, setPicId] = useState<string | undefined>(
    profile.profilePictureDocId,
  );
  const [licenseId, setLicenseId] = useState<string | undefined>(
    profile.driversLicenseDocId,
  );

  useEffect(() => {
    documentService
      .getMyDocuments()
      .then((docs) => {
        const pic = docs.find((d) => d.type === "profile_picture");
        const dl = docs.find((d) => d.type === "drivers_license");
        if (pic) setPicId(pic._id);
        if (dl) setLicenseId(dl._id);
      })
      .catch(() => {});
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(
      updateProfileSchema,
    ) as unknown as Resolver<FormValues>,
    defaultValues: buildFromProfile(profile),
    mode: "onBlur",
  });

  const {
    fields: ecFields,
    append: addEC,
    remove: removeEC,
  } = useFieldArray({
    control: form.control,
    name: "emergencyContacts",
  });

  const isCitizen = form.watch("citizenship.isPermanentResidentOrCitizen");
  const workAuthType = form.watch("workAuth.type");

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      // zodResolver coerces dob strings to Date at runtime; cast is safe
      const payload = {
        ...values,
        reference: showReference ? values.reference : undefined,
      };
      await profileService.updateMyProfile(
        payload as unknown as PatchProfileInput,
      );
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSaved();
      }, 1500);
    } catch (err) {
      setSaveError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
      >
        {/* ── Personal Information ─────────────────────────────────────────── */}
        <Section title="Personal Information">
          <DocUpload
            docType="profile_picture"
            category="onboarding"
            label="Profile photo"
            variant="photo"
            existingDocId={picId}
          />
          <Row>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
          <Row>
            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preferredName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
          <Row>
            <FormField
              control={form.control}
              name="ssn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SSN *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="pr-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      value={String(field.value ?? "")}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
          <Row>
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender *</FormLabel>
                  <FormControl>
                    <NativeSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    >
                      <option value="no_answer">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
        </Section>

        {/* ── Address ─────────────────────────────────────────────────────── */}
        <Section title="Address">
          <FormField
            control={form.control}
            name="address.addressLine1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address line 1 *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address.addressLine2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address line 2</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Row>
            <FormField
              control={form.control}
              name="address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
          <FormField
            control={form.control}
            name="address.zip"
            render={({ field }) => (
              <FormItem className="sm:max-w-[50%]">
                <FormLabel>ZIP code *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        {/* ── Contact ─────────────────────────────────────────────────────── */}
        <Section title="Contact">
          <Row>
            <FormField
              control={form.control}
              name="cellPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cell phone *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Row>
        </Section>

        {/* ── Citizenship & Work Authorization ────────────────────────────── */}
        <Section title="Citizenship & Work Authorization">
          <FormField
            control={form.control}
            name="citizenship.isPermanentResidentOrCitizen"
            render={({ field }) => (
              <FormItem>
                <FormLabel>US citizen or permanent resident? *</FormLabel>
                <FormControl>
                  <NativeSelect
                    value={field.value ? "yes" : "no"}
                    onChange={(v) => field.onChange(v === "yes")}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </NativeSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isCitizen && (
            <FormField
              control={form.control}
              name="citizenship.type"
              render={({ field }) => (
                <FormItem className="sm:max-w-[50%]">
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <NativeSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    >
                      <option value="">Select…</option>
                      <option value="citizen">Citizen</option>
                      <option value="green_card">Green card</option>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {!isCitizen && (
            <>
              <FormField
                control={form.control}
                name="workAuth.type"
                render={({ field }) => (
                  <FormItem className="sm:max-w-[50%]">
                    <FormLabel>Visa type</FormLabel>
                    <FormControl>
                      <NativeSelect
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      >
                        <option value="">Select…</option>
                        {["H1B", "L2", "F1-CPT", "F1-OPT", "H4", "other"].map(
                          (t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ),
                        )}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {workAuthType === "other" && (
                <FormField
                  control={form.control}
                  name="workAuth.otherTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visa title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Row>
                <FormField
                  control={form.control}
                  name="workAuth.startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="pr-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workAuth.endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="pr-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Row>
            </>
          )}
        </Section>

        {/* ── Reference ───────────────────────────────────────────────────── */}
        <Section title="Reference Contact">
          {!showReference ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start gap-2"
              onClick={() => setShowReference(true)}
            >
              <Plus className="w-4 h-4" /> Add reference contact (optional)
            </Button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue("reference", undefined);
                    setShowReference(false);
                  }}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
              <Row>
                <FormField
                  control={form.control}
                  name="reference.firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reference.lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Row>
              <Row>
                <FormField
                  control={form.control}
                  name="reference.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reference.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Row>
              <Row>
                <FormField
                  control={form.control}
                  name="reference.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Row>
            </div>
          )}
        </Section>

        {/* ── Emergency Contacts ──────────────────────────────────────────── */}
        <Section title="Emergency Contacts">
          {ecFields.map((f, i) => (
            <div key={f.id} className="rounded-lg  flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-label-md text-on-surface font-medium">
                  Contact {i + 1}
                </p>
                {ecFields.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeEC(i)}
                    className="text-destructive hover:text-destructive gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </div>
              <Row>
                <FormField
                  control={form.control}
                  name={`emergencyContacts.${i}.firstName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`emergencyContacts.${i}.lastName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Row>
              <Row>
                <FormField
                  control={form.control}
                  name={`emergencyContacts.${i}.phone`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`emergencyContacts.${i}.email`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Row>
              <FormField
                control={form.control}
                name={`emergencyContacts.${i}.relationship`}
                render={({ field }) => (
                  <FormItem className="sm:max-w-[50%]">
                    <FormLabel>Relationship *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => addEC({ ...emptyContact })}
            className="gap-2 self-start"
          >
            <Plus className="w-4 h-4" /> Add contact
          </Button>
        </Section>

        {/* ── Documents ───────────────────────────────────────────────────── */}
        <Section title="Documents">
          <DocUpload
            docType="drivers_license"
            category="onboarding"
            label="Driver's license"
            existingDocId={licenseId}
          />
        </Section>

        {saveError && (
          <p className="text-sm font-medium text-destructive">{saveError}</p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1 gap-2">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Saved
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  function fetchProfile() {
    profileService
      .getMyProfile()
      .then(setProfile)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-[48rem] mx-auto">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !profile) {
    return <p className="text-destructive">{error ?? "Profile not found."}</p>;
  }

  return (
    <div className="w-full max-w-[48rem] mx-auto flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-on-surface">My Profile</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {profile.email}
          </p>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <ProfileForm
          profile={profile}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            setLoading(true);
            fetchProfile();
          }}
        />
      ) : (
        <ProfileView profile={profile} />
      )}
    </div>
  );
}
