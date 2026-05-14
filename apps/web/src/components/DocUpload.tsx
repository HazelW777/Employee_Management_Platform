import { useEffect, useRef, useState } from "react";
import { Camera, Upload, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentService } from "@/services/document.service";
import type { DocType, DocCategory } from "@/services/document.service";

interface Props {
  docType: DocType;
  category: DocCategory;
  label: string;
  variant?: "photo" | "file";
  required?: boolean;
  /** Pass an existing document ID to pre-load and display the current file. */
  existingDocId?: string;
  /** Called whenever the user selects or clears a file (no upload happens here). */
  onFileChange?: (file: File | null) => void;
}

export function DocUpload({
  label,
  variant = "file",
  required,
  existingDocId,
  onFileChange,
}: Props) {
  const isPhoto = variant === "photo";
  const inputRef = useRef<HTMLInputElement>(null);

  // Existing file info loaded from the server
  const [existingDisplay, setExistingDisplay] = useState<string | null>(null);

  // Locally staged file (not yet uploaded)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  // Load existing file for display
  useEffect(() => {
    if (!existingDocId) return;
    if (isPhoto) {
      let url: string;
      documentService.getFileUrl(existingDocId)
        .then((u) => { url = u; setExistingDisplay(u); })
        .catch(() => {});
      return () => { if (url) URL.revokeObjectURL(url); };
    } else {
      documentService.getById(existingDocId)
        .then((doc) => setExistingDisplay(doc.filename))
        .catch(() => setExistingDisplay("Existing file"));
    }
  }, [existingDocId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke local blob URL on unmount or replacement
  useEffect(() => {
    return () => { if (pendingPreview?.startsWith("blob:")) URL.revokeObjectURL(pendingPreview); };
  }, [pendingPreview]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPhoto) {
      if (pendingPreview?.startsWith("blob:")) URL.revokeObjectURL(pendingPreview);
      setPendingPreview(URL.createObjectURL(file));
    }

    setPendingFile(file);
    onFileChange?.(file);
  }

  function handleClear() {
    if (pendingPreview?.startsWith("blob:")) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    onFileChange?.(null);
  }

  // ── Photo variant ─────────────────────────────────────────────────────────

  if (isPhoto) {
    const src = pendingPreview ?? existingDisplay;
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden bg-surface-container border-2 border-border hover:border-primary transition-colors group"
        >
          {src
            ? <img src={src} alt="Profile" className="w-full h-full object-cover" />
            : <Camera className="w-8 h-8 text-on-surface-variant m-auto" />}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
      </div>
    );
  }

  // ── File variant ──────────────────────────────────────────────────────────

  const displayName = pendingFile?.name ?? existingDisplay;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-label-md text-on-surface font-medium">
        {label}{required && " *"}
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="gap-2 shrink-0"
        >
          <Upload className="w-4 h-4" />
          {displayName ? "Replace" : "Choose file"}
        </Button>

        {displayName && (
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            {existingDocId && !pendingFile ? (
              <a
                href={`/api/documents/${existingDocId}/file`}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm text-primary hover:underline truncate"
              >
                {displayName}
              </a>
            ) : (
              <span className="text-body-sm text-on-surface truncate">{displayName}</span>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 text-on-surface-variant hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {!displayName && (
          <span className="text-label-sm text-on-surface-variant">No file selected</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
