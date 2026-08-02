import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlass, Books, Star, BookOpen, ArrowRight, Funnel } from "@phosphor-icons/react";
import { api, imgUrl } from "../lib/api";
import { useLang } from "../contexts/LangContext";
import AdBanner from "../components/AdBanner";

const CAT_ICON = { islamic:"☪️", science:"🔬", history:"🏛️", literature:"📖",
  self_help:"🌟", philosophy:"🧠", business:"💼", children:"🧒",
  biography:"👤", health:"❤️", technology:"💻", general:"📚" };

const BG_COLORS = [
  "from-emerald-700 to-teal-900","from-blue-700 to-indigo-900",
  "from-purple-700 to-violet-900","from-amber-600 to-orange-800",
  "from-rose-700 to-pink-900","from-cyan-700 to-sky-900",
  "from-lime-700 to-green-900","from-fuchsia-700 to-purple-900",
];

function BookCard({ book, idx }) {
  const { pick } = useLang();
  const title = pick(book.title_bn, book.title_en) || book.title_en || book.title_bn;
  const author = pick(book.author_bn, book.author_en) || book.author_en || book.author_bn;
  const bg = BG_COLORS[idx % BG_COLORS.length];
  const gutCover = book.gutenberg_id
    ? `https://www.gutenberg.org/cache/epub/${book.gutenberg_id}/pg${book.gutenberg_id}.cover.medium.jpg`
    : null;
  const cover = book.cover_image ? imgUrl(book.cover_image) : gutCover;

  return (
    <Link to={`/library/${book.id}`}
      className="bii-card overflow-hidden flex flex-col group hover:shadow-lg transition-shadow duration-200">
      {/* Cover */}
      <div className={`relative h-52 bg-gradient-to-br ${bg} overflow-hidden flex-shrink-0`}>
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.currentTarget.style.display="none"; }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
            <div className="text-5xl mb-2">{CAT_ICON[book.category] || "📚"}</div>
            <div className="text-center text-sm font-semibold leading-snug line-clamp-3 opacity-90">{title}</div>
          </div>
        )}
        {book.is_featured && (
          <div className="absolute top-2 left-2 bg-[var(--bii-gold)] text-[var(--bii-emerald)] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star size={10} weight="fill" /> Featured
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
        {book.year > 0 && (
          <span className="absolute bottom-2 right-2 text-[10px] text-white/70">{book.year}</span>
        )}
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-heading text-sm text-[var(--bii-emerald)] line-clamp-2 leading-snug mb-1">{title}</h3>
        {author && <p className="text-xs text-[var(--bii-text-soft)] line-clamp-1">{author}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bii-emerald)]/10 text-[var(--bii-emerald)] font-medium">
            {CAT_ICON[book.category]} {book.category}
          </span>
          {book.pages > 0 && <span className="text-[10px] text-[var(--bii-text-soft)]">{book.pages}p</span>}
        </div>
      </div>
    </Link>
  );
}

export default function Library() {
  const { pick } = useLang();
  const [books, setBooks]         = useState([]);
  const [cats, setCats]           = useState([]);
  const [cat, setCat]             = useState("all");
  const [search, setSearch]       = useState("");
  const [q, setQ]                 = useState("");
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(0);
  const PER = 40;

  useEffect(() => {
    api.get("/library/categories").then(r => setCats(Array.isArray(r.data) ? r.data : [])).catch(()=>{});
  }, []);

  const load = useCallback((catVal, searchVal, pageVal) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: PER, skip: pageVal * PER });
    if (catVal && catVal !== "all") params.set("category", catVal);
    if (searchVal) params.set("search", searchVal);
    api.get(`/library/books?${params}`)
      .then(r => { const d = r.data || {}; setBooks(Array.isArray(d.books) ? d.books : []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(cat, q, page); }, [cat, q, page, load]);

  const handleSearch = e => { e.preventDefault(); setQ(search); setPage(0); };

  return (
    <div data-testid="library-page" className="space-y-5">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--bii-emerald)] to-teal-900 p-6 text-white">
        <div className="islamic-pattern absolute inset-0 opacity-10 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Books size={28} weight="duotone" />
            <h1 className="font-heading text-2xl">{pick("লাইব্রেরি", "Library")}</h1>
          </div>
          <p className="text-sm text-white/80 mb-4">{pick("বিশ্বের সেরা ও কপিরাইট-মুক্ত বইয়ের সংগ্রহ", "World's best copyright-free books collection")}</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl px-3 py-2">
              <MagnifyingGlass size={18} className="text-white/70 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent placeholder-white/60 text-white text-sm outline-none"
                placeholder={pick("বই বা লেখক খুঁজুন...", "Search books or authors...")}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-[var(--bii-gold)] text-[var(--bii-emerald)] px-4 rounded-xl text-sm font-bold hover:opacity-90 transition">
              {pick("খুঁজুন", "Search")}
            </button>
          </form>
        </div>
      </div>

      <AdBanner slot="library-top" format="responsive" />

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {[{id:"all",name_bn:"সব",name_en:"All",icon:"📚"}, ...cats.filter(c=>c.name_bn!=="সব")].map(c => (
          <button key={c.id || "all"} onClick={() => { setCat(c.name_en?.toLowerCase().replace(/\s+/g,"_") || "all"); setPage(0); }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition
              ${(cat === "all" && (c.id === "all" || c.name_bn === "সব")) || cat === c.name_en?.toLowerCase().replace(/\s+/g,"_")
                ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)]"
                : "border-[var(--bii-border)] hover:border-[var(--bii-emerald)] text-[var(--bii-text)]"}`}
          >
            <span>{c.icon}</span> {pick(c.name_bn, c.name_en)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-[var(--bii-text-soft)]">
        <span>{pick(`${total}টি বই পাওয়া গেছে`, `${total} books found`)}</span>
        {total > PER && (
          <div className="flex gap-1">
            {page > 0 && <button onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded-lg border border-[var(--bii-border)] text-xs hover:border-[var(--bii-emerald)] transition">←</button>}
            <span className="px-3 py-1 text-xs">{page+1}/{Math.ceil(total/PER)}</span>
            {(page+1)*PER < total && <button onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded-lg border border-[var(--bii-border)] text-xs hover:border-[var(--bii-emerald)] transition">→</button>}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({length:8}).map((_,i)=>(
            <div key={i} className="bii-card overflow-hidden animate-pulse">
              <div className="h-52 bg-[var(--bii-border)]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-[var(--bii-border)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bii-border)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="bii-card p-12 text-center">
          <Books size={48} weight="duotone" className="text-[var(--bii-text-soft)] mx-auto mb-3" />
          <p className="text-[var(--bii-text-soft)]">{pick("কোনো বই পাওয়া যায়নি", "No books found")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((b, i) => <BookCard key={b.id} book={b} idx={i} />)}
        </div>
      )}
    </div>
  );
}
