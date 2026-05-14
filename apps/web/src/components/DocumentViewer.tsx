import { useEffect, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { documentService } from "@/services/document.service";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Props {
  docId: string;
  filename: string;
  mimetype?: string;
  /** Render as an inline thumbnail that opens a modal on click */
  variant?: "thumbnail" | "link";
}

function isImage(mime = "") {
  return mime.startsWith("image/");
}

export function DocumentViewer({ docId, filename, mimetype, variant = "link" }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (variant === "thumbnail") {
      // Pre-fetch for thumbnails so they show immediately
      load();
    }
  }, [docId]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  async function load() {
    if (blobUrl) return;
    setLoading(true);
    setError(null);
    try {
      const url = await documentService.getFileUrl(docId);
      setBlobUrl(url);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    await load();
    setOpen(true);
  }

  // ── Thumbnail variant ─────────────────────────────────────────────────────

  if (variant === "thumbnail") {
    if (loading) {
      return (
        <div className="w-20 h-20 rounded-lg bg-surface-container flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-on-surface-variant animate-spin" />
        </div>
      );
    }
    if (error || !blobUrl) {
      return (
        <div className="w-20 h-20 rounded-lg bg-surface-container flex items-center justify-center">
          <FileText className="w-6 h-6 text-on-surface-variant" />
        </div>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container border border-border hover:border-primary transition-colors shrink-0"
        >
          {isImage(mimetype) ? (
            <img src={blobUrl} alt={filename} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-7 h-7 text-on-surface-variant" />
            </div>
          )}
        </button>
        {open && <PreviewModal url={blobUrl} filename={filename} mimetype={mimetype} onClose={() => setOpen(false)} />}
      </>
    );
  }

  // ── Link variant ──────────────────────────────────────────────────────────

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-label-sm text-primary hover:underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        {filename}
      </button>
      {error && <span className="text-label-sm text-destructive ml-2">{error}</span>}
      {open && blobUrl && (
        <PreviewModal url={blobUrl} filename={filename} mimetype={mimetype} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function PreviewModal({
  url,
  filename,
  mimetype,
  onClose,
}: {
  url: string;
  filename: string;
  mimetype?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="text-label-md text-on-surface font-medium truncate pr-4">
            {filename}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(url, "_blank")}
            >
              Open in new tab
            </Button>
            <button
              onClick={onClose}
              className="p-1 rounded text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0">
          {isImage(mimetype) ? (
            <img
              src={url}
              alt={filename}
              className="max-w-full max-h-[80vh] object-contain mx-auto block p-4"
            />
          ) : (
            <iframe
              src={url}
              title={filename}
              className="w-full h-[80vh] border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
