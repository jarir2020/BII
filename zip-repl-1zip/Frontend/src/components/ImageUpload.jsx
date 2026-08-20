import React, { useRef, useState } from "react";
import { ImageSquare, X, Upload as UploadIcon } from "@phosphor-icons/react";
import { api, formatApiError } from "../lib/api";
import { useLang } from "../contexts/LangContext";

// Must match api.js — fall back to "" so relative /api/* paths proxy correctly.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

/**
 * Image upload widget — for admin forms.
 *   value:   current image URL (relative `/api/files/...` or absolute)
 *   onChange(newUrl):  called after successful upload
 */
export default function ImageUpload({ value, onChange, label, testid }) {
  const { pick } = useLang();
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const display = value
    ? value.startsWith("http") || value.startsWith("data:")
      ? value
      : `${BACKEND_URL}${value}`
    : "";

  const handleSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/upload", fd);
      onChange(data.url);
    } catch (e2) { setErr(formatApiError(e2)); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div data-testid={testid || "image-upload"}>
      {label && <div className="text-sm font-medium mb-1.5">{label}</div>}
      <div className="flex items-start gap-3">
        <div className="relative w-28 h-28 rounded-xl border-2 border-dashed border-[var(--bii-border)] bg-[var(--bii-cream)] overflow-hidden flex items-center justify-center">
          {display ? (
            <>
              <img src={display} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                data-testid={`${testid || "image-upload"}-clear`}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                aria-label="remove image"
              >
                <X size={14} weight="bold" />
              </button>
            </>
          ) : (
            <ImageSquare size={32} weight="duotone" className="text-[var(--bii-text-soft)]" />
          )}
        </div>
        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleSelect}
            className="hidden"
            data-testid={`${testid || "image-upload"}-file-input`}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            data-testid={`${testid || "image-upload"}-btn`}
            className="bii-btn-primary inline-flex items-center gap-2 text-sm"
          >
            <UploadIcon size={16} weight="bold" />
            {busy ? pick("আপলোড হচ্ছে...", "Uploading...") : pick("ছবি আপলোড", "Upload image")}
          </button>
          <div className="text-xs text-[var(--bii-text-soft)] mt-1.5">
            {pick("JPG, PNG, WebP — সর্বোচ্চ ১৫MB", "JPG, PNG, WebP — max 15MB")}
          </div>
          {err && <div className="text-xs text-red-700 mt-1">{err}</div>}
        </div>
      </div>
    </div>
  );
}
