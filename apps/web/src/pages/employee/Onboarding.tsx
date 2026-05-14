import { useEffect, useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Clock,
  XCircle,
  Plus,
  Trash2,
  ChevronDown,
  LogOut,
} from "lucide-react";
import {
  submitApplicationSchema,
  type Application,
  type ApplicationSnapshot,
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
  applicationService,
  type SubmitApplicationInput,
} from "@/services/application.service";
import { DocUpload } from "@/components/DocUpload";
import { documentService } from "@/services/document.service";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutThunk, selectAuthUser } from "@/store/auth.slice";

// ── Form type: date fields stored as strings by HTML inputs ──────────────────

type FormValues = Omit<SubmitApplicationInput, "dob" | "workAuth"> & {
  dob: string;
  workAuth?: Omit<
    NonNullable<SubmitApplicationInput["workAuth"]>,
    "startDate" | "endDate"
  > & {
    startDate?: string;
    endDate?: string;
  };
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

function collectErrorPaths(errors: unknown, prefix = ""): string[] {
  if (!errors || typeof errors !== "object") return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(
    errors as Record<string, unknown>,
  )) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      "message" in (value as Record<string, unknown>) &&
      typeof (value as { message?: unknown }).message === "string"
    ) {
      out.push(path);
    } else if (value && typeof value === "object") {
      out.push(...collectErrorPaths(value, path));
    }
  }
  return out;
}

function buildDefaults(snapshot?: ApplicationSnapshot | null): FormValues {
  const s = snapshot;
  return {
    firstName: s?.firstName ?? "",
    lastName: s?.lastName ?? "",
    middleName: s?.middleName ?? "",
    preferredName: s?.preferredName ?? "",
    address: {
      addressLine1: s?.address?.addressLine1 ?? "",
      addressLine2: s?.address?.addressLine2 ?? "",
      city: s?.address?.city ?? "",
      state: s?.address?.state ?? "",
      zip: s?.address?.zip ?? "",
    },
    cellPhone: s?.cellPhone ?? "",
    workPhone: s?.workPhone ?? "",
    ssn: s?.ssn ?? "",
    dob: s?.dob ? toDateInput(s.dob) : "",
    gender: (s?.gender ?? "no_answer") as Gender,
    citizenship: {
      isPermanentResidentOrCitizen:
        s?.citizenship?.isPermanentResidentOrCitizen ?? false,
      type: s?.citizenship?.type,
    },
    workAuth: s?.workAuth?.type
      ? {
          type: s.workAuth.type as WorkAuth["type"],
          otherTitle: s.workAuth.otherTitle ?? "",
          startDate: s.workAuth.startDate
            ? toDateInput(s.workAuth.startDate)
            : "",
          endDate: s.workAuth.endDate ? toDateInput(s.workAuth.endDate) : "",
        }
      : undefined,
    reference: s?.reference ? { ...s.reference } : undefined,
    emergencyContacts: s?.emergencyContacts?.length
      ? s.emergencyContacts.map((c) => ({ ...emptyContact, ...c }))
      : [{ ...emptyContact }],
  };
}

// ── Section wrapper ───────────────────────────────────────────────────────────

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

// ── Native select styled to match Input ───────────────────────────────────────

function NativeSelect({
  value,
  onChange,
  children,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
    </div>
  );
}

// ── Onboarding form ───────────────────────────────────────────────────────────

function OnboardingForm({
  snapshot,
  optReceiptDocId,
  onSubmitted,
}: {
  snapshot?: ApplicationSnapshot | null;
  optReceiptDocId?: string;
  onSubmitted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [driversLicenseFile, setDriversLicenseFile] = useState<File | null>(null);
  const [optReceiptFile, setOptReceiptFile] = useState<File | null>(null);
  const optReceiptReady = !!optReceiptDocId || optReceiptFile !== null;
  const [showReference, setShowReference] = useState(
    () => !!(snapshot?.reference?.firstName || snapshot?.reference?.lastName),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(
      submitApplicationSchema,
    ) as unknown as Resolver<FormValues>,
    defaultValues: buildDefaults(snapshot),
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
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (values.workAuth?.type === "F1-OPT" && !optReceiptReady) {
        setSubmitError("Please upload your OPT receipt before submitting.");
        setSubmitting(false);
        return;
      }
      // Upload staged documents before submitting so the backend can reference them
      if (profilePictureFile) {
        await documentService.upload(profilePictureFile, "profile_picture", "onboarding");
      }
      if (driversLicenseFile) {
        await documentService.upload(driversLicenseFile, "drivers_license", "onboarding");
      }
      if (optReceiptFile) {
        await documentService.upload(optReceiptFile, "opt_receipt", "visa");
      }
      const payload: FormValues = {
        ...values,
        reference: showReference ? values.reference : undefined,
        workAuth: isCitizen ? undefined : values.workAuth,
      };
      await applicationService.submit(
        payload as unknown as SubmitApplicationInput,
      );
      onSubmitted();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function onInvalid(errors: Record<string, unknown>) {
    console.error("Onboarding form validation errors:", errors);
    const paths = collectErrorPaths(errors);
    setSubmitError(
      paths.length
        ? `Please correct: ${paths.join(", ")}`
        : "Please correct the highlighted errors before submitting.",
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col gap-8"
      >
        {/* ── Personal Information ─────────────────────────────────────────── */}
        <Section title="Personal Information">
          <DocUpload
            variant="photo"
            docType="profile_picture"
            category="onboarding"
            label="Profile Photo"
            existingDocId={snapshot?.profilePictureDocId}
            onFileChange={(file) => setProfilePictureFile(file)}
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
                    <Input placeholder="XXX-XX-XXXX" {...field} />
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

        {/* ── Contact & Personal Details ──────────────────────────────────── */}
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
                    onChange={(v) => {
                      const yes = v === "yes";
                      field.onChange(yes);
                      if (yes) {
                        form.setValue("workAuth", undefined);
                      } else {
                        form.setValue("citizenship.type", undefined);
                      }
                    }}
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
                <FormItem>
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
                  <FormItem>
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
                          value={field.value ?? ""}
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
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Row>
              {workAuthType === "F1-OPT" && (
                <DocUpload
                  docType="opt_receipt"
                  category="visa"
                  label="OPT Receipt"
                  required
                  existingDocId={optReceiptDocId}
                  onFileChange={(file) => setOptReceiptFile(file)}
                />
              )}
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
              onClick={() => {
                form.setValue("reference", { ...emptyContact });
                setShowReference(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add reference contact
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
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
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
            <div key={f.id} className="rounded-lg p-2 flex flex-col gap-4">
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
            label="Driver's License"
            existingDocId={snapshot?.driversLicenseDocId}
            onFileChange={(file) => setDriversLicenseFile(file)}
          />
        </Section>

        {submitError && (
          <p className="text-sm font-medium text-destructive">{submitError}</p>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </Form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type PageState = "loading" | "none" | "pending" | "rejected" | "error";

export default function Onboarding() {
  const user = useAppSelector(selectAuthUser);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [state, setState] = useState<PageState>("loading");
  const [application, setApplication] = useState<Application | null>(null);
  const [optReceiptDocId, setOptReceiptDocId] = useState<string | undefined>();
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    applicationService
      .getMyApplication()
      .then(({ application: app, documents }) => {
        if (!app) {
          setState("none");
          return;
        }
        setApplication(app);
        setOptReceiptDocId(documents.optReceipt?._id ?? undefined);
        setState(app.status === "pending" ? "pending" : "rejected");
      })
      .catch((err) => {
        setFetchError(getApiErrorMessage(err));
        setState("error");
      });
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[48rem] flex flex-col gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="w-full max-w-[48rem] mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <div className="w-full flex justify-between">
            <h1 className="text-h1 text-on-surface">
              Welcome, {user?.username}
            </h1>
            <Button
              title="Sign out"
              variant="outline"
              onClick={async () => {
                await dispatch(logoutThunk());
                navigate("/");
              }}
            >
              <LogOut className="w-4 h-4 shrink-0" /> Sign Out
            </Button>
          </div>
          <p className="text-body-md text-on-surface-variant">
            {state === "pending"
              ? "Your application is under review."
              : "Complete your onboarding to access the platform."}
          </p>
        </div>

        {state === "error" && (
          <div className="rounded-lg border border-error-container bg-error-container/30 p-5 flex gap-3">
            <XCircle className="w-5 h-5 text-on-error-container shrink-0 mt-0.5" />
            <p className="text-body-sm text-on-error-container">{fetchError}</p>
          </div>
        )}

        {state === "pending" && (
          <div className="rounded-lg border border-border bg-card p-6 flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary-container shrink-0">
              <Clock className="w-5 h-5 text-on-secondary-container" />
            </div>
            <div>
              <p className="text-label-md text-on-surface font-medium">
                Application under review
              </p>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Submitted
              </p>
            </div>
          </div>
        )}

        {state === "rejected" && application?.feedback && (
          <div className="rounded-lg border border-error-container bg-error-container/20 p-5 flex gap-3">
            <XCircle className="w-5 h-5 text-on-error-container shrink-0 mt-0.5" />
            <div>
              <p className="text-label-md text-on-error-container font-medium">
                Application rejected
              </p>
              <p className="text-body-sm text-on-error-container mt-1">
                {application.feedback}
              </p>
            </div>
          </div>
        )}

        {(state === "none" || state === "rejected") && (
          <OnboardingForm
            snapshot={application?.snapshot}
            optReceiptDocId={optReceiptDocId}
            onSubmitted={() => setState("pending")}
          />
        )}
      </div>
    </div>
  );
}
