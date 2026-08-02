import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BookOpen, ArrowLeft, ShareNetwork, Books, Star, Clock, Globe, DeviceMobile } from "@phosphor-icons/react";
import { api, imgUrl } from "../lib/api";
import { useLang } from "../contexts/LangContext";

export default function LibraryBook() {
  const { id } = useParams();
  const { pick } = useLang();
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/library/books/${id}`)
      .then(r => {
        setBook(r.data);
        return api.get(`/library/books?category=${r.data.category}&limit=6`);
      })
      .then(r => setRelated((r.data.books || []).filter(b => b.id !== id).slice(0,5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const share = () => {
    const url = window.location.href;
    const title = pick(book?.title_bn, book?.title_en) || "";
    if (navigator.share) navigator.share({ title, url });
    else { navigator.clipboard?.writeText(url); alert(pick("লিংক কপি হয়েছে!","Link copied!")); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[var(--bii-border)] rounded w-1/3" />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="h-72 bg-[var(--bii-border)] rounded-2xl" />
        <div className="md:col-span-2 space-y-3">
          {[1,2,3,4].map(i=><div key={i} className="h-5 bg-[var(--bii-border)] rounded" />)}
        </div>
      </div>
    </div>
  );

  if (!book) return (
    <div className="bii-card p-12 text-center">
      <p className="text-[var(--bii-text-soft)]">{pick("বই পাওয়া যায়নি","Book not found")}</p>
      <Link to="/library" className="bii-btn-primary mt-4 inline-flex items-center gap-2"><ArrowLeft size={16}/>{pick("লাইব্রেরিতে ফিরুন","Back to Library")}</Link>
    </div>
  );

  const title  = pick(book.title_bn, book.title_en) || book.title_en;
  const author = pick(book.author_bn, book.author_en) || book.author_en;
  const desc   = pick(book.description_bn, book.description_en) || book.description_en;
  const gutCover = book.gutenberg_id
    ? `https://www.gutenberg.org/cache/epub/${book.gutenberg_id}/pg${book.gutenberg_id}.cover.medium.jpg`
    : null;
  const cover = book.cover_image ? imgUrl(book.cover_image) : gutCover;

  return (
    <div className="space-y-6" data-testid="library-book-page">
      <Link to="/library" className="inline-flex items-center gap-1.5 text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] transition">
        <ArrowLeft size={16}/> {pick("লাইব্রেরি","Library")}
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Cover */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden shadow-xl aspect-[3/4] bg-gradient-to-br from-[var(--bii-emerald)] to-teal-900 flex items-center justify-center">
            {cover ? (
              <img src={cover} alt={title} className="w-full h-full object-cover"
                onError={e=>{e.currentTarget.style.display="none";}} />
            ) : (
              <div className="text-center text-white p-6">
                <Books size={64} weight="duotone" className="mx-auto mb-3 opacity-80"/>
                <div className="font-heading text-lg leading-snug">{title}</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <Link to={`/library/${id}/read`}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition"
              style={{background:"linear-gradient(90deg,#d49b18,#b77900)",boxShadow:"0 4px 14px rgba(212,155,24,0.28)"}}>
              <DeviceMobile size={18} weight="fill"/>
              {pick("ওয়েবসাইটে পড়ুন","Read inside website")}
            </Link>
            <button onClick={share}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--bii-border)] text-sm text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)] transition">
              <ShareNetwork size={16}/> {pick("শেয়ার করুন","Share")}
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl text-[var(--bii-emerald)] leading-snug mb-1">{title}</h1>
            {author && <p className="text-[var(--bii-text-soft)]">{pick("লেখক:","Author:")} <span className="font-medium text-[var(--bii-text)]">{author}</span></p>}
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            {book.category && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bii-emerald)]/10 text-[var(--bii-emerald)] border border-[var(--bii-emerald)]/20">
                {book.category}
              </span>
            )}
            {book.language && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                <Globe size={12}/> {book.language.toUpperCase()}
              </span>
            )}
            {book.pages > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-[var(--bii-cream)] text-[var(--bii-text-soft)] border border-[var(--bii-border)]">
                <BookOpen size={12}/> {book.pages} {pick("পৃষ্ঠা","pages")}
              </span>
            )}
            {book.year > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-[var(--bii-cream)] text-[var(--bii-text-soft)] border border-[var(--bii-border)]">
                <Clock size={12}/> {book.year}
              </span>
            )}
            {book.total_reads > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-100">
                <Star size={12}/> {book.total_reads} {pick("বার পড়া হয়েছে","reads")}
              </span>
            )}
          </div>

          {desc && (
            <div className="bii-card p-4">
              <h3 className="font-heading text-sm text-[var(--bii-emerald)] mb-2">{pick("বইয়ের বিবরণ","About this Book")}</h3>
              <p className="text-sm text-[var(--bii-text)] leading-relaxed whitespace-pre-line">{desc}</p>
            </div>
          )}

          <div className="bii-card p-4 border-[var(--bii-emerald)]/20 bg-[var(--bii-emerald)]/5">
            <p className="text-sm text-[var(--bii-emerald)]">
              {pick("এই বইটি আপনার ওয়েবসাইটের ভিতরের Reader-এ বাংলা ও ইংরেজিতে পড়তে পারবেন।", "Read this book in Bengali or English using the Reader inside your website.")}
            </p>
          </div>
        </div>
      </div>

      {/* Related books */}
      {related.length > 0 && (
        <div>
          <h2 className="font-heading text-lg text-[var(--bii-emerald)] mb-3">{pick("একই ধরনের বই","Related Books")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {related.map(b => {
              const rc = b.cover_image ? imgUrl(b.cover_image)
                : b.gutenberg_id ? `https://www.gutenberg.org/cache/epub/${b.gutenberg_id}/pg${b.gutenberg_id}.cover.medium.jpg`
                : null;
              return (
                <Link key={b.id} to={`/library/${b.id}`} className="bii-card overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-gradient-to-br from-[var(--bii-emerald)] to-teal-900 flex items-center justify-center overflow-hidden">
                    {rc ? <img src={rc} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={e=>{e.currentTarget.style.display="none";}} />
                      : <Books size={28} weight="duotone" className="text-white opacity-60"/>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-[var(--bii-emerald)] line-clamp-2 leading-snug">
                      {pick(b.title_bn,b.title_en)||b.title_en}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
