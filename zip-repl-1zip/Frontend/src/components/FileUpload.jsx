import React, { useRef, useState } from "react";
import { FilePdf, FileHtml, File, BookOpen, X, Upload as UploadIcon } from "@phosphor-icons/react";
import { api, formatApiError } from "../lib/api";
import { useLang } from "../contexts/LangContext";

const FILE_ICONS = {
  pdf: FilePdf,
  epub: BookOpen,
  html: FileHtml,
  htm: FileHtml,
};

const ACCEPT_DEFAULT = ".pdf,.epub,.html,.htm";

/**
 * Document file upload widget — for admin library forms.
 *   value:   { url, file_type, file_size } or null
 *   onChange(obj): called after successful upload
 */
export default function FileUpload({ value, onChange, label, testid, accept }) {
  const { pick } = useLang();
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const IconComp = value?.file_type ? (FILE_ICONS[value.file_type] || File) : File;

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/library/upload", fd);
      onChange({ url: data.url, file_type: data.file_type, file_size: data.file_size });
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div data-testid={testid || "file-upload"}>
      {label && <div className="text-sm font-medium mb-1.5">{label}</div>}
      <div className="flex items-start gap-3">
        <div className="relative w-28 h-28 rounded-xl border-2 border-dashed border-[var(--bii-border)] bg-[var(--bii-cream)] overflow-hidden flex flex-col items-center justify-center gap-1">
          {value?.url ? (
            <>
              <IconComp size={36} weight="duotone" className="text-[var(--bii-emerald)]" />
              <span className="text-[10px] font-medium text-[var(--bii-emerald)] uppercase">
                {value.file_type}
              </span>
              <button
                type="button"
                onClick={() => onChange(null)}
                data-testid={`${testid || "file-upload"}-clear`}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                aria-label="remove file"
              >
                <X size={14} weight="bold" />
              </button>
            </>
          ) : (
            <>
              <File size={32} weight="duotone" className="text-[var(--bii-text-soft)]" />
              <span className="text-[9px] text-[var(--bii-text-soft)]">PDF/EPUB/HTML</span>
            </>
          )}
        </div>
        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept={accept || ACCEPT_DEFAULT}
            onChange={handleSelect}
            className="hidden"
            data-testid={`${testid || "file-upload"}-file-input`}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            data-testid={`${testid || "file-upload"}-btn`}
            className="bii-btn-primary inline-flex items-center gap-2 text-sm"
          >
            <UploadIcon size={16} weight="bold" />
            {busy
              ? pick("আপলোড হচ্ছে...", "Uploading...")
              : value?.url
                ? pick("ফাইল পরিবর্তন করুন", "Change file")
                : pick("ডকুমেন্ট আপলোড", "Upload document")}
          </button>
          <div className="text-xs text-[var(--bii-text-soft)] mt-1.5">
            {pick("PDF, EPUB, HTML — কোনো সাইজ লিমিট নেই", "PDF, EPUB, HTML — no size limit")}
          </div>
          {value?.url && value?.file_size > 0 && (
            <div className="text-xs text-[var(--bii-text-soft)] mt-0.5">
              {formatSize(value.file_size)}
            </div>
          )}
          {err && <div className="text-xs text-red-700 mt-1">{err}</div>}
        </div>
      </div>
    </div>
  );
}
