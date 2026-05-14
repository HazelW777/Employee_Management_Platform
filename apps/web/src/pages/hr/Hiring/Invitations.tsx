import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { sendInvitationSchema } from "shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api";
import {
  invitationService,
  type Invitation,
  type SendInvitationInput,
} from "@/services/invitation.service";
import { Skeleton } from "@/components/ui/skeleton";

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending: "bg-secondary-container text-on-secondary-container",
  accepted: "bg-primary-container text-on-primary-container",
  expired: "bg-surface-container-high text-on-surface-variant",
  revoked: "bg-error-container text-on-error-container",
};

const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
};

function StatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function Invitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null); // id of row in flight

  const form = useForm<SendInvitationInput>({
    resolver: zodResolver(sendInvitationSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  async function fetchInvitations(p = page) {
    setLoading(true);
    setError(null);
    try {
      const data = await invitationService.getAll(p, PAGE_SIZE);
      setInvitations(data.invitations);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvitations(page);
  }, [page]);

  async function onInviteSubmit(values: SendInvitationInput) {
    setInviteLoading(true);
    setInviteError(null);
    try {
      await invitationService.send(values);
      setInviteOpen(false);
      form.reset();
      fetchInvitations(1);
      setPage(1);
    } catch (err) {
      setInviteError(getApiErrorMessage(err));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleResend(id: string) {
    setActionLoading(id);
    try {
      await invitationService.resend(id);
      fetchInvitations(page);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevoke(id: string) {
    setActionLoading(id);
    try {
      await invitationService.revoke(id);
      fetchInvitations(page);
    } finally {
      setActionLoading(null);
    }
  }

  function handleInviteOpenChange(open: boolean) {
    setInviteOpen(open);
    if (!open) {
      form.reset();
      setInviteError(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-on-surface">Invitations</h1>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Invite
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low">
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Sent
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Expires
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
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
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container">
                        <Mail className="w-6 h-6 text-on-surface-variant" />
                      </div>
                      <p className="text-body-md text-on-surface-variant">
                        No invitations yet
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInviteOpen(true)}
                      >
                        Send your first invite
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const status = inv.status;
                  const busy = actionLoading === inv._id;
                  return (
                    <tr
                      key={inv._id}
                      className="hover:bg-surface-container-low transition-colors"
                    >
                      <td className="px-4 py-2 text-on-surface font-medium">
                        {inv.email}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-2 text-on-surface-variant">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-on-surface-variant">
                        {formatDate(inv.expiresAt)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={status !== "pending" || busy}
                            onClick={() => handleResend(inv._id)}
                            className={`${
                              status === "pending"
                                ? "text-primary hover:text-primary"
                                : "text-on-surface-variant opacity-40"
                            }`}
                          >
                            Resend
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={status !== "pending" || busy}
                            onClick={() => handleRevoke(inv._id)}
                            className={`${
                              status === "pending"
                                ? "text-error hover:text-error"
                                : "text-on-surface-variant opacity-40"
                            }`}
                          >
                            Revoke
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={handleInviteOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription className="text-body-sm">
              An invitation link will be sent to their email address.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onInviteSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label-md text-on-surface">
                      Email address
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="colleague@company.com"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {inviteError && (
                <p className="text-sm font-medium text-destructive">
                  {inviteError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={inviteLoading}
                  onClick={() => handleInviteOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
