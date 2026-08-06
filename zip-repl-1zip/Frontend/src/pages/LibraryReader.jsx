import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CaretLeft, CaretRight, Download, Warning } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useLang } from "../contexts/LangContext";

export default function LibraryReader() {
  const { id } = useParams();
  const { pick } = useLang();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [epubError, setEpubError] = useState(false);
  const [location, setLocation] = useState({ current: 0, total: 0 }); // 2026-08-06: EPUB nav
  const epubRef = useRef(null);
  const epubInstance = useRef(null);
  const renditionRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/library/books/${id}`)
      .then((r) => setBook(r.data))
      .catch(() => setBook(null))
      .finally(() => setLoading(false));
  }, [id]);

  // EPUB.js renderer
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

        // Clean up previous instance
        if (epubInstance.current) {
          epubInstance.current.destroy();
        }

        const Book = window.ePub;

        // 2026-08-06: Fetch EPUB as Blob to avoid relative path resolution issues
        // (epub.js resolves META-INF/* relative to serve URL, dropping the book UUID)
        const resp = await fetch(`/api/library/serve/${id}`, { credentials: 'include' });
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
        renditionRef.current = rendition;

        // 2026-08-06: Remove sandbox from epub.js internal iframe to allow script execution
        rendition.hooks.content.register((contents) => {
          const iframe = contents.document?.defaultView?.frameElement;
          if (iframe && iframe.hasAttribute("sandbox")) {
            iframe.removeAttribute("sandbox");
          }
        });

        // 2026-08-06: Track location for page indicator
        rendition.on("relocated", (loc) => {
          setLocation({
            current: loc.start?.location?.displayed?.page || 0,
            total: loc.start?.location?.total || 0,
          });
        });

        // 2026-08-06: Keyboard navigation
        rendition.on("keydown", (e) => {
          if (e.key === "ArrowRight") rendition.next();
          if (e.key === "ArrowLeft") rendition.prev();
        });
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
      renditionRef.current = null;
    };
  }, [book, id]);

  const title = book ? pick(book.title_bn, book.title_en) || book.title_en : "";
  const author = book ? pick(book.author_bn, book.author_en) || book.author_en : "";

  if (loading) {
    return (
      <div className="bii-card p-8 animate-pulse">
        <div className="h-8 bg-[var(--bii-border)] rounded w-1/2 mb-6" />
        <div className="h-96 bg-[var(--bii-border)] rounded-xl" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="bii-card p-10 text-center">
        <p className="text-[var(--bii-text-soft)]">{pick("বই পাওয়া যায়নি", "Book not found")}</p>
        <Link to="/library" className="bii-btn-primary mt-4 inline-flex items-center gap-2">
          <ArrowLeft size={16} /> {pick("লাইব্রেরিতে ফিরুন", "Back to Library")}
        </Link>
      </div>
    );
  }

  if (!book.file_url) {
    return (
      <div className="bii-card p-10 text-center">
        <BookOpen size={42} className="mx-auto mb-3 text-[var(--bii-text-soft)]" />
        <p className="font-medium text-[var(--bii-text)]">
          {pick("এই বইয়ের জন্য কোনো ফাইল পাওয়া যায়নি।", "No file found for this book.")}
        </p>
        <Link to={`/library/${id}`} className="bii-btn-primary mt-4 inline-flex items-center gap-2">
          <ArrowLeft size={16} /> {pick("বইয়ের তথ্য", "Book details")}
        </Link>
      </div>
    );
  }

  const renderViewer = () => {
    switch (book.file_type) {
      case "pdf":
        return (
          <iframe
            src={`/api/library/serve/${id}`}
            className="w-full rounded-xl border border-[var(--bii-border)]"
            style={{ height: "80vh" }}
            title={title}
          />
        );

      case "epub":
        if (epubError) {
          return (
            <div className="bii-card p-8 text-center">
              <Warning size={42} className="mx-auto mb-3 text-amber-500" />
              <p className="text-[var(--bii-text)]">{pick("EPUB লোড করা যায়নি।", "Failed to load EPUB.")}</p>
              <a href={`/api/library/serve/${id}`} target="_blank" rel="noreferrer"
                className="bii-btn-primary mt-4 inline-flex items-center gap-2">
                {pick("ডাউনলোড করুন", "Download instead")}
              </a>
            </div>
          );
        }
        return (
          <div
            ref={epubRef}
            className="w-full rounded-xl border border-[var(--bii-border)] bg-white"
            style={{ height: "80vh" }}
          />
        );

      case "html":
      case "htm":
        return (
          <iframe
            src={`/api/library/serve/${id}`}
            className="w-full rounded-xl border border-[var(--bii-border)]"
            style={{ height: "80vh" }}
            sandbox="allow-same-origin allow-scripts"
            title={title}
          />
        );

      default:
        // Fallback: try to open in iframe
        return (
          <iframe
            src={`/api/library/serve/${id}`}
            className="w-full rounded-xl border border-[var(--bii-border)]"
            style={{ height: "80vh" }}
            title={title}
          />
        );
    }
  };

  return (
    <article data-testid="library-reader-page" className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link to={`/library/${id}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)]">
          <ArrowLeft size={17} /> {pick("বইয়ের তথ্য", "Book details")}
        </Link>
        <a href={`/api/library/download/${id}`}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition">
          <Download size={15} /> {pick("ডাউনলোড", "Download")}
        </a>
      </div>

      {/* Title bar */}
      <header className="rounded-2xl bg-gradient-to-br from-[var(--bii-emerald)] to-teal-900 text-white p-5 sm:p-6 mb-5">
        <div className="flex items-center gap-2 text-white/75 text-xs mb-2">
          <BookOpen size={17} /> {pick("ওয়েবসাইট Reader", "In-site Reader")}
        </div>
        <h1 className="font-heading text-xl sm:text-2xl leading-snug">{title}</h1>
        {author && <p className="mt-1 text-sm text-white/75">{author}</p>}
        {book.file_type && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase">
            {book.file_type}
          </div>
        )}
      </header>

      {/* Viewer */}
      <div className="bii-card p-2 sm:p-4">
        {renderViewer()}

        {/* 2026-08-06: EPUB navigation controls */}
        {book.file_type === "epub" && location.total > 0 && (
          <div className="flex items-center justify-center gap-4 mt-3 py-2 border-t border-[var(--bii-border)]">
            <button onClick={() => renditionRef.current?.prev()}
              className="p-2 rounded-lg border border-[var(--bii-border)] hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition disabled:opacity-40"
              disabled={location.current <= 1}>
              <CaretLeft size={18} />
            </button>
            <span className="text-xs text-[var(--bii-text-soft)] tabular-nums">
              {location.current} / {location.total}
            </span>
            <button onClick={() => renditionRef.current?.next()}
              className="p-2 rounded-lg border border-[var(--bii-border)] hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition disabled:opacity-40"
              disabled={location.current >= location.total}>
              <CaretRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-start gap-2 text-xs text-[var(--bii-text-soft)]">
        <Warning size={16} className="flex-shrink-0 text-[var(--bii-emerald)]" />
        <span>{pick(
          "এই Reader-এ Admin দ্বারা আপলোড করা ডকুমেন্ট দেখানো হচ্ছে। কপিরাইটযুক্ত বইয়ের ব্যবহারের জন্য অনুমতি নিশ্চিত করুন।",
          "This Reader displays documents uploaded by the Admin. Confirm permission before using copyrighted material."
        )}</span>
      </div>
    </article>
  );
}
