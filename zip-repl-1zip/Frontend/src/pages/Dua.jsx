import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MagnifyingGlass, Heart, Copy, Share, ArrowLeft, Star,
  SunHorizon, HandsPraying, Mosque, ForkKnife, Moon,
  House, Car, Smiley, CloudLightning, Infinity as InfinityIcon,
  BookOpenText, BookmarkSimple, Clock, Fire, ArrowClockwise,
  Check, X,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { toast } from "sonner";

// লোকাল স্টোরেজ কী
const LS_RECENT = "bii_dua_recent";
const LS_FAV    = "bii_dua_fav";

function getLocalFavs() { try { return JSON.parse(localStorage.getItem(LS_FAV) || "[]"); } catch { return []; } }
function setLocalFavs(ids) { localStorage.setItem(LS_FAV, JSON.stringify(ids)); }
function getLocalRecent() { try { return JSON.parse(localStorage.getItem(LS_RECENT) || "[]"); } catch { return []; } }
function addLocalRecent(id) {
  let r = getLocalRecent().filter(x => x !== id);
  r.unshift(id);
  localStorage.setItem(LS_RECENT, JSON.stringify(r.slice(0, 20)));
}

const CAT_ICONS = {
  "সকাল-সন্ধ্যার যিকির": SunHorizon,
  "দৈনন্দিন জীবনের দোয়া": HandsPraying,
  "নামাজের দোয়া": Mosque,
  "খাওয়া-দাওয়ার দোয়া": ForkKnife,
  "ঘুমের দোয়া": Moon,
  "ঘরে প্রবেশ ও বের হওয়ার দোয়া": House,
  "সফরের দোয়া": Car,
  "অসুস্থতার দোয়া": Smiley,
  "বিপদ ও দুশ্চিন্তার দোয়া": CloudLightning,
  "তাসবিহ ও যিকির": InfinityIcon,
  "কুরআনের দোয়া": BookOpenText,
};
const CAT_COLORS = {
  "সকাল-সন্ধ্যার যিকির": "#f59e0b",
  "দৈনন্দিন জীবনের দোয়া": "#10b981",
  "নামাজের দোয়া": "#3b82f6",
  "খাওয়া-দাওয়ার দোয়া": "#ef4444",
  "ঘুমের দোয়া": "#8b5cf6",
  "ঘরে প্রবেশ ও বের হওয়ার দোয়া": "#06b6d4",
  "সফরের দোয়া": "#f97316",
  "অসুস্থতার দোয়া": "#ec4899",
  "বিপদ ও দুশ্চিন্তার দোয়া": "#64748b",
  "তাসবিহ ও যিকির": "#84cc16",
  "কুরআনের দোয়া": "#14b8a6",
};

export default function Dua() {
  const { user } = useAuth();
  const { t, pick } = useLang();
  const [view, setView]         = useState("home");
  const [categories, setCategories]   = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [duas, setDuas]         = useState([]);
  const [allDuas, setAllDuas]   = useState([]);
  const [selectedDua, setSelectedDua] = useState(null);
  const [todayDua, setTodayDua] = useState(null);
  const [popularDuas, setPopularDuas] = useState([]);
  const [search, setSearch]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab]           = useState("home");
  const [favIds, setFavIds]     = useState(getLocalFavs);
  const [favDuas, setFavDuas]   = useState([]);
  const [recentDuas, setRecentDuas] = useState([]);
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const searchTimer = useRef(null);

  // ── বুটআপ ──
  useEffect(() => {
    api.get("/dua-categories").then(r => setCategories(r.data || [])).catch(() => {});
    api.get("/duas/today").then(r => setTodayDua(r.data?.id ? r.data : null)).catch(() => {});
    api.get("/duas/popular").then(r => setPopularDuas(r.data || [])).catch(() => {});
    api.get("/duas").then(r => setAllDuas(r.data || [])).catch(() => {});
  }, []);

  // ── recent sync ──
  useEffect(() => {
    if (!allDuas.length) return;
    const ids = getLocalRecent();
    const rs = ids.map(id => allDuas.find(d => d.id === id)).filter(Boolean);
    setRecentDuas(rs);
  }, [allDuas]);

  // ── favorites sync ──
  useEffect(() => {
    if (!allDuas.length) return;
    const fds = allDuas.filter(d => favIds.includes(d.id));
    setFavDuas(fds);
  }, [favIds, allDuas]);

  // ── সার্চ ──
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      api.get("/duas", { params: { search: search.trim() } })
        .then(r => setSearchResults(r.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
  }, [search]);

  // ── ক্যাটাগরি দোয়া লোড ──
  const loadCategory = useCallback(async (cat) => {
    setLoading(true);
    setSelectedCat(cat);
    setView("category");
    try {
      const r = await api.get("/duas", { params: { category: cat.id } });
      setDuas(r.data || []);
    } catch { setDuas([]); }
    finally { setLoading(false); }
  }, []);

  // ── দোয়া detail ──
  const openDua = useCallback(async (dua) => {
    setSelectedDua(dua);
    setView("detail");
    addLocalRecent(dua.id);
    if (user) api.post(`/duas/${dua.id}/view`).catch(() => {});
    setRecentDuas(prev => {
      const next = [dua, ...prev.filter(d => d.id !== dua.id)].slice(0, 20);
      return next;
    });
  }, [user]);

  // ── Favorite toggle ──
  const toggleFav = useCallback(async (dua) => {
    const isFav = favIds.includes(dua.id);
    const next = isFav ? favIds.filter(id => id !== dua.id) : [dua.id, ...favIds];
    setFavIds(next);
    setLocalFavs(next);
    if (user) {
      try {
        if (isFav) await api.delete(`/duas/${dua.id}/favorite`);
        else        await api.post(`/duas/${dua.id}/favorite`);
      } catch {}
    }
    toast.success(isFav ? "প্রিয় থেকে সরানো হয়েছে" : "প্রিয়তে যোগ হয়েছে ❤️");
  }, [favIds, user]);

  // ── কপি ──
  const copyDua = (dua) => {
    const text = [
      dua.title_bn,
      dua.arabic_text && `\n${dua.arabic_text}`,
      dua.transliteration && `\nউচ্চারণ: ${dua.transliteration}`,
      dua.meaning_bn && `\nঅর্থ: ${dua.meaning_bn}`,
      dua.source && `\nসূত্র: ${dua.source}`,
    ].filter(Boolean).join("");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success("দোয়া কপি হয়েছে!");
    });
  };

  // ── শেয়ার ──
  const shareDua = (dua) => {
    if (navigator.share) {
      navigator.share({ title: dua.title_bn, text: `${dua.arabic_text}\n${dua.meaning_bn}` }).catch(() => {});
    } else {
      copyDua(dua);
    }
  };

  const isFav = selectedDua ? favIds.includes(selectedDua.id) : false;

  return (
    <div className="min-h-screen" data-testid="dua-page">
      {/* ── DETAIL VIEW ── */}
      {view === "detail" && selectedDua && (
        <DuaDetail
          dua={selectedDua}
          isFav={isFav}
          copied={copied}
          onBack={() => setView(selectedCat ? "category" : "home")}
          onFav={() => toggleFav(selectedDua)}
          onCopy={() => copyDua(selectedDua)}
          onShare={() => shareDua(selectedDua)}
        />
      )}

      {/* ── CATEGORY VIEW ── */}
      {view === "category" && selectedCat && (
        <CategoryView
          cat={selectedCat}
          duas={duas}
          loading={loading}
          favIds={favIds}
          onBack={() => setView("home")}
          onOpen={openDua}
          onFav={toggleFav}
        />
      )}

      {/* ── HOME VIEW ── */}
      {view === "home" && (
        <div>
          {/* বড় ব্যানার */}
          <div className="relative rounded-2xl overflow-hidden mb-6" style={{background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)"}}>
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
            <div className="relative p-6 text-white text-center">
              <div className="text-4xl mb-2">☪️</div>
              <h1 className="font-heading text-2xl sm:text-3xl mb-1">{t("menuDua")}</h1>
              <p className="text-sm text-emerald-200 mb-4">{pick("প্রতিদিনের জীবনে আল্লাহর সাথে সংযুক্ত থাকুন", "Stay connected with Allah in daily life")}</p>
              {/* সার্চ */}
              <div className="relative max-w-md mx-auto">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={pick("যেকোনো দোয়া খুঁজুন...", "Search any dua...")}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/95 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-lg"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* সার্চ ফলাফল */}
          {search.trim() && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MagnifyingGlass size={18} className="text-[var(--bii-emerald)]" />
                <h2 className="font-semibold">"{search}" এর ফলাফল</h2>
                {searching && <span className="text-xs text-[var(--bii-text-soft)]">খোঁজা হচ্ছে...</span>}
              </div>
              {!searching && searchResults.length === 0 && (
                <p className="text-[var(--bii-text-soft)] text-sm text-center py-6">কোনো দোয়া পাওয়া যায়নি।</p>
              )}
              <div className="space-y-2">
                {searchResults.map(d => (
                  <DuaRow key={d.id} dua={d} isFav={favIds.includes(d.id)} onOpen={openDua} onFav={toggleFav} />
                ))}
              </div>
            </div>
          )}

          {/* ট্যাব */}
          {!search.trim() && (
            <>
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {[
                  { key: "home", label: t("home"), icon: <House size={15} /> },
                  { key: "popular", label: t("duaPopular"), icon: <Fire size={15} /> },
                  { key: "recent", label: t("duaRecent"), icon: <Clock size={15} /> },
                  { key: "favorites", label: t("duaFavorites"), icon: <Heart size={15} weight="fill" /> },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                      tab === t.key
                        ? "bg-[var(--bii-emerald)] text-white shadow-md"
                        : "bg-white border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)]"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* আজকের দোয়া */}
              {tab === "home" && todayDua && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={18} weight="fill" className="text-yellow-500" />
                    <h2 className="font-semibold text-[var(--bii-text)]">{t("duaTodaysDua")}</h2>
                  </div>
                  <button
                    onClick={() => openDua(todayDua)}
                    className="w-full text-left rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition active:scale-[0.99]"
                    style={{background: "linear-gradient(135deg, #064e3b, #047857)"}}
                  >
                    <div className="p-5 text-white">
                      <div className="text-xs text-emerald-300 font-medium mb-2 uppercase tracking-wider">آية اليوم</div>
                      <div className="font-arabic text-xl leading-loose text-right mb-3" dir="rtl">{todayDua.arabic_text}</div>
                      <div className="text-sm text-emerald-100 mb-1">{todayDua.transliteration}</div>
                      <div className="font-medium text-base">{todayDua.title_bn}</div>
                      {todayDua.meaning_bn && (
                        <div className="text-xs text-emerald-200 mt-1 line-clamp-2">{todayDua.meaning_bn}</div>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* ক্যাটাগরি গ্রিড */}
              {tab === "home" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookmarkSimple size={18} className="text-[var(--bii-emerald)]" />
                    <h2 className="font-semibold">{t("duaCategories")}</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map(cat => {
                      const Icon = CAT_ICONS[cat.name_bn] || HandsPraying;
                      const color = cat.color || CAT_COLORS[cat.name_bn] || "#10b981";
                      return (
                        <button
                          key={cat.id}
                          onClick={() => loadCategory(cat)}
                          className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-[var(--bii-border)] hover:border-transparent hover:shadow-lg transition active:scale-[0.97] text-center"
                          style={{"--cat-color": color}}
                        >
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition"
                            style={{background: `${color}20`, color}}
                          >
                            {cat.icon || <Icon size={28} weight="duotone" />}
                          </div>
                          <span className="text-sm font-medium text-[var(--bii-text)] leading-tight">{cat.name_bn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* সর্বাধিক পঠিত */}
              {tab === "popular" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Fire size={18} weight="fill" className="text-orange-500" />
                    <h2 className="font-semibold">{pick("সর্বাধিক পড়া দোয়া", "Most Read Duas")}</h2>
                  </div>
                  {popularDuas.length === 0
                    ? <p className="text-center text-[var(--bii-text-soft)] py-8">এখনো কোনো দোয়া পড়া হয়নি।</p>
                    : <div className="space-y-2">{popularDuas.map(d => <DuaRow key={d.id} dua={d} isFav={favIds.includes(d.id)} onOpen={openDua} onFav={toggleFav} />)}</div>
                  }
                </div>
              )}

              {/* সাম্প্রতিক */}
              {tab === "recent" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={18} className="text-blue-500" />
                    <h2 className="font-semibold">{pick("সম্প্রতি দেখা দোয়া", "Recently Viewed Duas")}</h2>
                  </div>
                  {recentDuas.length === 0
                    ? <p className="text-center text-[var(--bii-text-soft)] py-8">এখনো কোনো দোয়া দেখা হয়নি।</p>
                    : <div className="space-y-2">{recentDuas.map(d => <DuaRow key={d.id} dua={d} isFav={favIds.includes(d.id)} onOpen={openDua} onFav={toggleFav} />)}</div>
                  }
                </div>
              )}

              {/* প্রিয় */}
              {tab === "favorites" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Heart size={18} weight="fill" className="text-red-500" />
                    <h2 className="font-semibold">{pick("প্রিয় দোয়াসমূহ", "Favorite Duas")}</h2>
                  </div>
                  {favDuas.length === 0
                    ? (
                      <div className="text-center py-12">
                        <Heart size={48} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-[var(--bii-text-soft)]">এখনো কোনো দোয়া প্রিয় হিসেবে যোগ হয়নি।</p>
                        <p className="text-xs text-[var(--bii-text-soft)] mt-1">যেকোনো দোয়ায় ❤ চাপলে প্রিয়তে যোগ হবে।</p>
                      </div>
                    )
                    : <div className="space-y-2">{favDuas.map(d => <DuaRow key={d.id} dua={d} isFav={true} onOpen={openDua} onFav={toggleFav} />)}</div>
                  }
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── ক্যাটাগরি ভিউ ─── */
function CategoryView({ cat, duas, loading, favIds, onBack, onOpen, onFav }) {
  const { t, pick } = useLang();
  const Icon = CAT_ICONS[cat.name_bn] || HandsPraying;
  const color = cat.color || CAT_COLORS[cat.name_bn] || "#10b981";
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] mb-4 transition">
        <ArrowLeft size={18} /> {t("duaAllCategories")}
      </button>
      {/* হেডার */}
      <div className="flex items-center gap-4 p-4 rounded-2xl mb-5" style={{background: `${color}15`, border: `1.5px solid ${color}30`}}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{background: `${color}25`}}>
          {cat.icon || <Icon size={28} weight="duotone" />}
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold">{cat.name_bn}</h2>
          {cat.description && <p className="text-sm text-[var(--bii-text-soft)]">{cat.description}</p>}
          <p className="text-xs mt-1" style={{color}}>{duas.length}টি দোয়া</p>
        </div>
      </div>
      {loading
        ? <div className="text-center py-10 text-[var(--bii-text-soft)]"><ArrowClockwise size={28} className="animate-spin mx-auto mb-2" /> {t("loading")}</div>
        : duas.length === 0
          ? <p className="text-center py-10 text-[var(--bii-text-soft)]">{pick("এই ক্যাটাগরিতে এখনো কোনো দোয়া যোগ হয়নি।", "No duas in this category yet.")}</p>
          : <div className="space-y-2">{duas.map(d => <DuaRow key={d.id} dua={d} isFav={favIds.includes(d.id)} onOpen={onOpen} onFav={onFav} />)}</div>
      }
    </div>
  );
}

/* ─── দোয়া রো ─── */
function DuaRow({ dua, isFav, onOpen, onFav }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-[var(--bii-border)] hover:border-[var(--bii-emerald)]/40 hover:shadow-md transition group">
      <button onClick={() => onOpen(dua)} className="flex-1 text-left min-w-0">
        <div className="font-medium text-[var(--bii-text)] mb-1">{dua.title_bn}</div>
        {dua.arabic_text && (
          <div className="font-arabic text-base text-right text-[var(--bii-emerald)] leading-loose truncate" dir="rtl">{dua.arabic_text}</div>
        )}
        {dua.meaning_bn && (
          <div className="text-xs text-[var(--bii-text-soft)] mt-1 line-clamp-2">{dua.meaning_bn}</div>
        )}
      </button>
      <button
        onClick={() => onFav(dua)}
        className={`p-2 rounded-xl flex-shrink-0 transition ${isFav ? "text-red-500 bg-red-50" : "text-gray-300 hover:text-red-400"}`}
        title={isFav ? "প্রিয় থেকে সরান" : "প্রিয়তে যোগ করুন"}
      >
        <Heart size={20} weight={isFav ? "fill" : "regular"} />
      </button>
    </div>
  );
}

/* ─── দোয়া ডিটেইল ভিউ ─── */
function DuaDetail({ dua, isFav, copied, onBack, onFav, onCopy, onShare }) {
  const { t, pick } = useLang();
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] mb-4 transition">
        <ArrowLeft size={18} /> {t("back")}
      </button>

      <div className="bg-white rounded-2xl border border-[var(--bii-border)] overflow-hidden shadow-sm">
        {/* শিরোনাম */}
        <div className="p-5 border-b border-[var(--bii-border)]" style={{background: "linear-gradient(135deg, #064e3b08, #04785710)"}}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-heading text-xl font-bold text-[var(--bii-text)] flex-1">{dua.title_bn}</h2>
            <button onClick={onFav} className={`p-2.5 rounded-xl flex-shrink-0 transition ${isFav ? "bg-red-50 text-red-500" : "bg-[var(--bii-cream)] text-gray-400 hover:text-red-400"}`}>
              <Heart size={22} weight={isFav ? "fill" : "regular"} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* আরবি */}
          {dua.arabic_text && (
            <div className="text-center">
              <div className="text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-3">{t("duaArabic")}</div>
              <div
                className="font-arabic text-3xl sm:text-4xl text-[var(--bii-emerald)] leading-[2] text-right px-2"
                dir="rtl"
                style={{fontFamily: "'Amiri', 'Scheherazade New', serif"}}
              >
                {dua.arabic_text}
              </div>
            </div>
          )}

          {/* উচ্চারণ */}
          {dua.transliteration && (
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">{t("duaTransliteration")}</div>
              <div className="text-blue-900 text-sm leading-relaxed italic">{dua.transliteration}</div>
            </div>
          )}

          {/* অর্থ */}
          {dua.meaning_bn && (
            <div className="bg-[var(--bii-cream)] rounded-xl p-4">
              <div className="text-xs text-[var(--bii-text-soft)] font-medium uppercase tracking-wider mb-1">{t("duaMeaning")}</div>
              <div className="text-[var(--bii-text)] leading-relaxed">{dua.meaning_bn}</div>
            </div>
          )}

          {/* কখন পড়তে হয় */}
          {dua.when_to_read && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl">
              <Clock size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-yellow-700 font-medium mb-0.5">{t("duaWhenToRead")}</div>
                <div className="text-sm text-yellow-900">{dua.when_to_read}</div>
              </div>
            </div>
          )}

          {/* ফজিলত */}
          {dua.fazilat && (
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
              <Star size={18} weight="fill" className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-emerald-700 font-medium mb-0.5">{t("duaFazilat")}</div>
                <div className="text-sm text-emerald-900 leading-relaxed">{dua.fazilat}</div>
              </div>
            </div>
          )}

          {/* উৎস */}
          {dua.source && (
            <div className="text-xs text-[var(--bii-text-soft)] text-center">
              📚 {t("duaSource")}: <span className="font-medium text-[var(--bii-text)]">{dua.source}</span>
            </div>
          )}
        </div>

        {/* অ্যাকশন বাটন */}
        <div className="p-4 border-t border-[var(--bii-border)] grid grid-cols-2 gap-3">
          <button
            onClick={onCopy}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bii-cream)] hover:bg-[var(--bii-border)] transition font-medium text-sm text-[var(--bii-text)]"
          >
            {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
            {copied ? t("copied") : t("copy")}
          </button>
          <button
            onClick={onShare}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bii-emerald)] text-white hover:bg-[var(--bii-emerald)]/90 transition font-medium text-sm"
          >
            <Share size={18} /> {t("share")}
          </button>
        </div>
      </div>
    </div>
  );
}
