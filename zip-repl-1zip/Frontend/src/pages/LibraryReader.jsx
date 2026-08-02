import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, TextAa, Minus, Plus, Globe, ShieldCheck } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useLang } from "../contexts/LangContext";

function paragraphs(value) {
  return String(value || "")
    .split(/\n\s*\n|\r?\n(?=\d+[.)]\s| অধ্যায়| Chapter )/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function LibraryReader() {
  const { id } = useParams();
  const { lang, pick } = useLang();
  const [book, setBook] = useState(null);
  const [fontSize, setFontSize] = useState(18);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/library/books/${id}`)
      .then((response) => {
        setBook(response.data);
      })
      .catch(() => setBook(null))
      .finally(() => setLoading(false));
  }, [id]);

  const content = useMemo(() => {
    if (!book) return "";
    return lang === "bn"
      ? (book.reader_content_bn || book.reader_content_en || "")
      : (book.reader_content_en || book.reader_content_bn || "");
  }, [book, lang]);
  const sections = useMemo(() => paragraphs(content), [content]);
  const title = book ? pick(book.title_bn, book.title_en) || book.title_en : "";
  const author = book ? pick(book.author_bn, book.author_en) || book.author_en : "";

  if (loading) {
    return <div className="bii-card p-8 animate-pulse"><div className="h-8 bg-[var(--bii-border)] rounded w-1/2 mb-6" /><div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-4 bg-[var(--bii-border)] rounded" />)}</div></div>;
  }

  if (!book) {
    return <div className="bii-card p-10 text-center">{pick("বই পাওয়া যায়নি", "Book not found")}</div>;
  }

  return (
    <article data-testid="library-reader-page" className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link to={`/library/${id}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)]">
          <ArrowLeft size={17} /> {pick("বইয়ের তথ্য", "Book details")}
        </Link>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFontSize((size) => Math.max(15, size - 1))} aria-label={pick("লেখা ছোট করুন", "Decrease text size")} className="p-2 rounded-lg border border-[var(--bii-border)]"><Minus size={15} /></button>
          <TextAa size={16} className="text-[var(--bii-text-soft)]" />
          <button onClick={() => setFontSize((size) => Math.min(25, size + 1))} aria-label={pick("লেখা বড় করুন", "Increase text size")} className="p-2 rounded-lg border border-[var(--bii-border)]"><Plus size={15} /></button>
        </div>
      </div>

      <header className="rounded-2xl bg-gradient-to-br from-[var(--bii-emerald)] to-teal-900 text-white p-6 sm:p-8 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white/75 text-xs mb-3"><BookOpen size={17} /> {pick("ওয়েবসাইট Reader", "In-site Reader")}</div>
            <h1 className="font-heading text-2xl sm:text-3xl leading-snug">{title}</h1>
            {author && <p className="mt-2 text-sm text-white/75">{author}</p>}
          </div>
          <Globe size={28} weight="duotone" className="text-[var(--bii-gold)] flex-shrink-0" />
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold">
          <Globe size={16} />
          {lang === "bn" ? "বাংলা" : "English"}
        </div>
      </header>

      <div className="bii-card p-5 sm:p-8">
        {sections.length ? (
          <div className="space-y-6" style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }}>
            {sections.map((section, index) => (
              <section key={`${index}-${section.slice(0, 20)}`} className={index === 0 ? "" : "border-t border-[var(--bii-border)] pt-6"}>
                {section.match(/^(অধ্যায়|Chapter|\d+[.)])/i) && <h2 className="font-heading text-[var(--bii-emerald)] mb-2">{section.split(/\r?\n/)[0]}</h2>}
                <p className="whitespace-pre-line text-[var(--bii-text)]">{section}</p>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <BookOpen size={42} className="mx-auto mb-3 text-[var(--bii-text-soft)]" />
            <p className="font-medium text-[var(--bii-text)]">{pick("এই বইয়ের Reader content এখনো যোগ করা হয়নি।", "Reader content has not been added for this book yet.")}</p>
            <p className="text-sm text-[var(--bii-text-soft)] mt-2">{pick("Admin panel থেকে অনুমোদিত বাংলা বা ইংরেজি content যোগ করুন।", "Add authorized Bengali or English content from the Admin panel.")}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-[var(--bii-text-soft)]">
        <ShieldCheck size={16} className="flex-shrink-0 text-[var(--bii-emerald)]" />
        <span>{pick("এই Reader-এ Admin দ্বারা সংরক্ষিত কনটেন্ট দেখানো হচ্ছে। কপিরাইটযুক্ত বইয়ের পূর্ণ লেখা ব্যবহারের জন্য অনুমতি নিশ্চিত করুন।", "This Reader displays content stored by the Admin. Confirm permission before adding full copyrighted text.")}</span>
      </div>
    </article>
  );
}