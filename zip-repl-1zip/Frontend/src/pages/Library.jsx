import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlass, Books, Star, BookOpen, ArrowRight, Funnel, SquaresFour, List, FilePdf, FileHtml, File } from "@phosphor-icons/react";
import { api, imgUrl } from "../lib/api";
import { useLang } from "../contexts/LangContext";
import { useAds } from "../contexts/AdsContext";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";
import FullScreenAdOverlay from "../components/FullScreenAdOverlay";
import { useNavigate } from "react-router-dom";

const CAT_ICON = { islamic:"☪️", science:"🔬", history:"🏛️", literature:"📖",
  self_help:"🌟", philosophy:"🧠", business:"💼", children:"🧒",
  biography:"👤", health:"❤️", technology:"💻", general:"📚" };

const BG_COLORS = [
  "from-emerald-700 to-teal-900","from-blue-700 to-indigo-900",
  "from-purple-700 to-violet-900","from-amber-600 to-orange-800",
  "from-rose-700 to-pink-900","from-cyan-700 to-sky-900",
  "from-lime-700 to-green-900","from-fuchsia-700 to-purple-900",
];

const FILE_ICONS = { pdf: FilePdf, epub: BookOpen, html: FileHtml, htm: FileHtml };

function BookCard({ book, idx, viewMode, onClick }) {
  const { pick } = useLang();
  const title = pick(book.title_bn, book.title_en) || book.title_en || book.title_bn;
  const author = pick(book.author_bn, book.author_en) || book.author_en || book.author_bn;
  const bg = BG_COLORS[idx % BG_COLORS.length];
  const cover = book.cover_image ? imgUrl(book.cover_image) : null;
  const FileIcon = FILE_ICONS[book.file_type] || File;

  if (viewMode === "list") {
    return (
      <button type="button" onClick={onClick}
        className="bii-card flex items-center gap-3 p-3 hover:shadow-md transition-shadow duration-200 w-full text-left">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${bg} flex items-center justify-center flex-shrink-0`}>
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <FileIcon size={20} weight="duotone" className="text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-sm text-[var(--bii-emerald)] truncate">{title}</h3>
          <p className="text-xs text-[var(--bii-text-soft)] truncate">{author || "—"}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {book.file_type && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bii-emerald)]/10 text-[var(--bii-emerald)] font-medium uppercase">
              {book.file_type}
            </span>
          )}
          {book.is_featured && <Star size={12} weight="fill" className="text-[var(--bii-gold)]" />}
          <ArrowRight size={14} className="text-[var(--bii-text-soft)]" />
        </div>
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick}
      className="bii-card overflow-hidden flex flex-col group hover:shadow-lg transition-shadow duration-200 w-full text-left">
      {/* Cover */}
      <div className={`relative h-52 bg-gradient-to-br ${bg} overflow-hidden flex-shrink-0`}>
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.currentTarget.style.display="none"; }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
            <FileIcon size={40} weight="duotone" className="mb-2 opacity-80" />
            <div className="text-center text-sm font-semibold leading-snug line-clamp-3 opacity-90">{title}</div>
          </div>
        )}
        {book.is_featured && (
          <div className="absolute top-2 left-2 bg-[var(--bii-gold)] text-[var(--bii-emerald)] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star size={10} weight="fill" /> Featured
          </div>
        )}
        {book.file_type && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {book.file_type}
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-heading text-sm text-[var(--bii-emerald)] line-clamp-2 leading-snug mb-1">{title}</h3>
        {author && <p className="text-xs text-[var(--bii-text-soft)] line-clamp-1">{author}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bii-emerald)]/10 text-[var(--bii-emerald)] font-medium">
            {CAT_ICON[book.category] || "📚"} {book.category}
          </span>
        </div>
      </div>
    </button>
  );
}

const LIBRARY_FIRST_AD_KEY = "bii_library_first_ad_shown";

export default function Library() {
  const { pick } = useLang();
  const navigate = useNavigate();
  const { platform, loadRewardAds, rewardAds } = useAds();
  const [books, setBooks]         = useState([]);
  const [cats, setCats]           = useState([]);
  const [cat, setCat]             = useState("all");
  const [search, setSearch]       = useState("");
  const [q, setQ]                 = useState("");
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(0);
  const [viewMode, setViewMode]   = useState("grid");
  const [showAd, setShowAd]       = useState(false);
  const [pendingBookId, setPendingBookId] = useState(null);
  const PER = 40;

  useEffect(() => {
    api.get("/library/categories").then(r => setCats(Array.isArray(r.data) ? r.data : [])).catch(()=>{});

    // Pre-load reward ads for first-click interstitial (native platform only)
    const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform
      ? window.Capacitor.isNativePlatform() : false;
    if (isNative && platform === "app") {
      loadRewardAds("app");
    }
  }, []);

  const load = useCallback((catVal, searchVal, pageVal) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: PER, skip: pageVal * PER });
    if (catVal && catVal !== "all") params.set("category", catVal);
    if (searchVal) params.set("search", searchVal);
    api.get(`/library/books?${params}`)
      .then(r => {
        const d = r.data || {};
        if (Array.isArray(d)) { setBooks(d); setTotal(d.length); }
        else { setBooks(Array.isArray(d.books) ? d.books : []); setTotal(d.total || 0); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(cat, q, page); }, [cat, q, page, load]);

  const handleSearch = e => { e.preventDefault(); setQ(search); setPage(0); };

  // First-click interstitial: show ad before navigating to book (native only, once)
  const handleBookClick = (bookId) => {
    const alreadyShown = localStorage.getItem(LIBRARY_FIRST_AD_KEY);
    if (alreadyShown) {
      navigate(`/library/${bookId}`);
      return;
    }
    const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform
      ? window.Capacitor.isNativePlatform() : false;
    if (!isNative || platform !== "app" || rewardAds.length === 0) {
      navigate(`/library/${bookId}`);
      return;
    }
    setPendingBookId(bookId);
    setShowAd(true);
  };

  return (
    <div data-testid="library-page" className="space-y-5 pb-16 sm:pb-24">
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

      <BottomBanner slot="library-bottom" />

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

      {/* Stats + View Toggle */}
      <div className="flex items-center justify-between text-sm text-[var(--bii-text-soft)]">
        <span>{pick(`${total}টি বই পাওয়া গেছে`, `${total} books found`)}</span>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border border-[var(--bii-border)] rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 transition ${viewMode === "grid" ? "bg-[var(--bii-emerald)] text-white" : "hover:bg-[var(--bii-cream)]"}`}
              title={pick("গ্রিড ভিউ", "Grid view")}>
              <SquaresFour size={16} />
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-1.5 transition ${viewMode === "list" ? "bg-[var(--bii-emerald)] text-white" : "hover:bg-[var(--bii-cream)]"}`}
              title={pick("লিস্ট ভিউ", "List view")}>
              <List size={16} />
            </button>
          </div>
          {/* Pagination */}
          {total > PER && (
            <div className="flex gap-1">
              {page > 0 && <button onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded-lg border border-[var(--bii-border)] text-xs hover:border-[var(--bii-emerald)] transition">←</button>}
              <span className="px-3 py-1 text-xs">{page+1}/{Math.ceil(total/PER)}</span>
              {(page+1)*PER < total && <button onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded-lg border border-[var(--bii-border)] text-xs hover:border-[var(--bii-emerald)] transition">→</button>}
            </div>
          )}
        </div>
      </div>

      {/* Grid / List */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
          {Array.from({length:8}).map((_,i)=>(
            viewMode === "grid" ? (
              <div key={i} className="bii-card overflow-hidden animate-pulse">
                <div className="h-52 bg-[var(--bii-border)]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-[var(--bii-border)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--bii-border)] rounded w-1/2" />
                </div>
              </div>
            ) : (
              <div key={i} className="bii-card h-16 animate-pulse" />
            )
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="bii-card p-12 text-center">
          <Books size={48} weight="duotone" className="text-[var(--bii-text-soft)] mx-auto mb-3" />
          <p className="text-[var(--bii-text-soft)]">{pick("কোনো বই পাওয়া যায়নি", "No books found")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((b, i) => (
            <BookCard key={b.id} book={b} idx={i} viewMode="grid"
              onClick={() => handleBookClick(b.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {books.map((b, i) => (
            <BookCard key={b.id} book={b} idx={i} viewMode="list"
              onClick={() => handleBookClick(b.id)} />
          ))}
        </div>
      )}

      {/* First-click interstitial ad overlay */}
      {showAd && (
        <FullScreenAdOverlay
          ad={rewardAds.length > 0 ? rewardAds[Math.floor(Math.random() * rewardAds.length)] : null}
          onComplete={() => {
            setShowAd(false);
            if (pendingBookId) {
              localStorage.setItem(LIBRARY_FIRST_AD_KEY, "1");
              navigate(`/library/${pendingBookId}`);
            }
          }}
          title="বিজ্ঞাপন"
          skipLabel="বাদ দিও"
          minDuration={3}
        />
      )}
    </div>
  );
}
