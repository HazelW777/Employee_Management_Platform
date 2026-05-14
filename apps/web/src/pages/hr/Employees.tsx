import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import { type Profile, CITIZENSHIP_TYPE_LABELS } from "shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import { profileService } from "@/services/profile.service";

export function getFullName(p: Profile) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

const PAGE_SIZE = 20;

export default function Employees() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<Profile[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    profileService
      .getAll(page, PAGE_SIZE, debouncedSearch || undefined)
      .then((data) => {
        if (!cancelled) {
          setData(data.profiles);
          setTotalPages(data.pagination.pages);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-on-surface">Employees</h1>

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
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface-container-low">
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  SSN
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Citizenship
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Work Auth
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Phone
                </th>
                <th className="text-left px-4 py-3 text-label-md text-on-surface-variant font-medium">
                  Email
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-destructive"
                  >
                    {error}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container">
                        <FileText className="w-6 h-6 text-on-surface-variant" />
                      </div>
                      <p className="text-body-md text-on-surface-variant">
                        No employees
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((profile) => (
                  <tr key={profile._id}>
                    <td className="px-4 py-3">{getFullName(profile)}</td>
                    <td className="px-4 py-3">{profile.ssn}</td>
                    <td className="px-4 py-3">
                      {profile.citizenship?.isPermanentResidentOrCitizen
                        ? ((profile.citizenship.type
                            ? CITIZENSHIP_TYPE_LABELS[profile.citizenship.type]
                            : null) ?? "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {profile.citizenship?.isPermanentResidentOrCitizen
                        ? "—"
                        : (profile.workAuth?.type ?? "—")}
                    </td>
                    <td className="px-4 py-3">{profile.cellPhone}</td>
                    <td className="px-4 py-3">{profile.email}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/hr/employees/${profile._id}`)}
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
