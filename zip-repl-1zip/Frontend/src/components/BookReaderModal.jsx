import React, { useEffect, useRef, useState } from "react";
import { Download, X, Warning } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";

// 2026-08-06: Reusable full-viewport book reader modal (PDF/EPUB/HTML)
export default function BookReaderModal({ book, onClose }) {
  const { pick } = useLang();
  const [epubError, setEpubError] = useState(false);
  const epubRef = useRef(null);
  const epubInstance = useRef(null);

  // Escape key + body scroll lock
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // EPUB.js renderer (same pattern as LibraryReader.jsx)
  useEffect(() => {
    if (!book || book.file_type !== "epub" || !epubRef.current) return;

    const loadEpub = async () => {
      try {
        // 2026-08-06: Load JSZip first (epub.js dependency), then epub.js
        if (!window.JSZip) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        if (!window.ePub) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (epubInstance.current) {
          epubInstance.current.destroy();
        }

        const Book = window.ePub;

        // 2026-08-06: Fetch EPUB as Blob to avoid relative path resolution issues
        const resp = await fetch(`/api/library/serve/${book.id}`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`EPUB fetch failed: ${resp.status}`);
        const blob = await resp.blob();
        const bookInstance = new Book(blob);
        epubInstance.current = bookInstance;

        const rendition = bookInstance.renderTo(epubRef.current, {
          width: "100%",
          height: "100%",
          spread: "none",
        });

        rendition.display();
      } catch (err) {
        console.error("EPUB load error:", err);
        setEpubError(true);
      }
    };

    loadEpub();

    return () => {
      if (epubInstance.current) {
        epubInstance.current.destroy();
        epubInstance.current = null;
      }
    };
  }, [book]);

  const title = book ? pick(book.title_bn, book.title_en) || book.title_en : "";
  const viewerHeight = "calc(100vh - 56px)";

  const renderViewer = () => {
    switch (book.file_type) {
      case "pdf":
        return (
          <iframe
            src={`/api/library/serve/${book.id}`}
            className="w-full"
            style={{ height: viewerHeight }}
            title={title}
          />
        );

      case "epub":
        if (epubError) {
          return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <Warning size={42} className="text-amber-500" />
              <p className="text-[var(--bii-text)]">{pick("EPUB লোড করা যায়নি।", "Failed to load EPUB.")}</p>
              <a href={`/api/library/serve/${book.id}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bii-emerald)] text-white text-sm hover:opacity-90 transition">
                <Download size={15} /> {pick("ডাউনলোড করুন", "Download instead")}
              </a>
            </div>
          );
        }
        return (
          <div
            ref={epubRef}
            className="w-full bg-white"
            style={{ height: viewerHeight }}
          />
        );

      case "html":
      case "htm":
        return (
          <iframe
            src={`/api/library/serve/${book.id}`}
            className="w-full"
            style={{ height: viewerHeight }}
            sandbox="allow-same-origin"
            title={title}
          />
        );

      default:
        return (
          <iframe
            src={`/api/library/serve/${book.id}`}
            className="w-full"
            style={{ height: viewerHeight }}
            title={title}
          />
        );
    }
  };

  if (!book) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col"
      onClick={onClose}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[var(--bii-emerald)] to-teal-900 flex-shrink-0"
        onClick={e => e.stopPropagation()}>
        <h2 className="flex-1 min-w-0 text-white font-heading text-sm sm:text-base truncate">
          {title}
        </h2>
        <a href={`/api/library/download/${book.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition flex-shrink-0"
          title={pick("ডাউনলোড", "Download")}>
          <Download size={15} />
          <span className="hidden sm:inline">{pick("ডাউনলোড", "Download")}</span>
        </a>
        <button onClick={onClose}
          className="p-2 rounded-lg bg-white/15 text-white hover:bg-white/25 transition flex-shrink-0"
          title={pick("বন্ধ করুন", "Close")}>
          <X size={18} weight="bold" />
        </button>
      </div>

      {/* Viewer content */}
      <div className="flex-1 overflow-hidden bg-[var(--bii-border)]"
        onClick={e => e.stopPropagation()}>
        {renderViewer()}
      </div>
    </div>
  );
}
