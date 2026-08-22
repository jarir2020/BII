import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Gift, PlayCircle, CheckCircle, CopySimple,
  Trophy, ClockCounterClockwise, ArrowRight, Warning,
  Star, Fire, FilmSlate, YoutubeLogo, Image as ImageIcon,
  VideoCamera, ArrowClockwise, Medal, Crown, Eye, Link as LinkIcon,
  Money, Clock, CheckFat, XCircle, Spinner, DotsThreeVertical,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../lib/api";
import { useAds } from "../contexts/AdsContext";
import { useLang } from "../contexts/LangContext";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";
import FullScreenAdOverlay from "../components/FullScreenAdOverlay";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

const BN = (n) => String(Math.floor(n ?? 0)).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

function ytId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function adLink(url) {
  const value = String(url || "").trim();
  if (!value) return "#";
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://${value}`;
}

// ── Circular Countdown ──────────────────────────────────────────────────────
function CircleCountdown({ total, onDone }) {
  const [left, setLeft] = useState(total);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  });
  const pct  = ((total - left) / total) * 100;
  const r    = 28;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bii-emerald)" strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-[var(--bii-emerald)]">
          {BN(left)}
        </div>
      </div>
      <p className="text-xs text-[var(--bii-text-soft)]">সেকেন্ড বাকি</p>
    </div>
  );
}

// ── Cooldown Timer ──────────────────────────────────────────────────────────
function CooldownTimer({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  });
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--bii-text-soft)]">
      <ClockCounterClockwise size={16} weight="bold" className="text-[var(--bii-emerald)]" />
      <span>{BN(left)} সেকেন্ড পরে পরবর্তী ভিডিও দেখুন</span>
    </div>
  );
}

// ── Ad Player ───────────────────────────────────────────────────────────────
function AdPlayer({ ad, adsEnabled }) {
  const videoRef = useRef(null);
  if (ad && ad.ad_type === "youtube") {
    const id = ytId(ad.media_url);
    return (
      <div className="rounded-2xl overflow-hidden border border-[var(--bii-border)] bg-black aspect-video w-full">
        {id ? (
          <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&controls=0&modestbranding=1`}
            title={ad.title} className="w-full h-full"
            allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          <div className="flex items-center justify-center h-full text-white/60 text-sm">ভিডিও লোড হচ্ছে…</div>
        )}
      </div>
    );
  }
  if (ad && ad.ad_type === "video") {
    return (
      <div className="rounded-2xl overflow-hidden border border-[var(--bii-border)] bg-black aspect-video w-full">
        <video ref={videoRef} src={ad.media_url} autoPlay playsInline
          className="w-full h-full object-contain" poster={ad.thumbnail_url || undefined} />
      </div>
    );
  }
  if (ad && ad.ad_type === "image") {
    return (
      <div className="rounded-2xl overflow-hidden border border-[var(--bii-border)] bg-[var(--bii-cream)] flex items-center justify-center min-h-[160px]">
        <img src={ad.media_url} alt={ad.title} className="max-w-full max-h-64 object-contain rounded-xl" />
      </div>
    );
  }
  if (ad && ad.ad_type === "link") {
    return (
      <a
        href={adLink(ad.media_url)}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video w-full overflow-hidden rounded-2xl border border-[var(--bii-border)] bg-gradient-to-br from-[var(--bii-emerald)] to-teal-700 text-white"
        aria-label={`${ad.title} — পূর্ণস্ক্রিনে খুলুন`}
      >
        {ad.thumbnail_url ? (
          <img
            src={ad.thumbnail_url}
            alt={ad.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <LinkIcon size={48} weight="duotone" />
            <span className="text-sm font-semibold">ওয়েব লিংক খুলুন</span>
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/65 px-4 py-3 text-center text-sm font-semibold">
          লিংকে ক্লিক করে পূর্ণস্ক্রিনে খুলুন ↗
        </span>
      </a>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--bii-border)] bg-[var(--bii-cream)] min-h-[150px] flex items-center justify-center">
      {adsEnabled
        ? <AdBanner slot="reward-zone" format="responsive" className="w-full" />
        : (
          <div className="text-center p-8 text-[var(--bii-text-soft)]">
            <PlayCircle size={48} weight="duotone" className="mx-auto mb-2 text-[var(--bii-emerald)]" />
            <p className="text-sm font-medium">বিজ্ঞাপন লোড হচ্ছে…</p>
          </div>
        )}
    </div>
  );
}

// ── Rank Badge ──────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (rank === 1) return <Crown size={22} weight="fill" className="text-yellow-500" />;
  if (rank === 2) return <Medal size={22} weight="fill" className="text-slate-400" />;
  if (rank === 3) return <Medal size={22} weight="fill" className="text-amber-600" />;
  return <span className="font-bold text-sm text-[var(--bii-text-soft)] w-6 text-center">{BN(rank)}</span>;
}

// ── Leaderboard Tab ─────────────────────────────────────────────────────────
function LeaderboardTab() {
  const { t, pick } = useLang();
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/rewards/leaderboard")
      .then((r) => setList(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="flex justify-center py-8"><div className="w-8 h-8 rounded-full border-4 border-[var(--bii-emerald)] border-t-transparent animate-spin" /></div>;
  if (!list.length) return (
    <div className="text-center py-8 text-[var(--bii-text-soft)]">
      <Trophy size={48} weight="duotone" className="mx-auto mb-3 text-[var(--bii-emerald)] opacity-40" />
      <p className="text-sm">{t("noData")}</p>
    </div>
  );
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  return (
    <div className="space-y-4 pb-8">
      <div className="bii-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} weight="fill" className="text-[var(--bii-gold)]" />
          <h3 className="font-heading text-base text-[var(--bii-emerald)]">{pick("শীর্ষ ৩ জন", "Top 3")}</h3>
        </div>
        <div className="flex items-end justify-center gap-3">
          {top3[1] && (
            <div className={`flex flex-col items-center gap-2 flex-1 pb-2 rounded-2xl pt-4 ${top3[1].is_me ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"}`}>
              <RankBadge rank={2} />
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-600 overflow-hidden">
                {top3[1].avatar ? <img src={top3[1].avatar} alt="" className="w-full h-full object-cover" /> : top3[1].name[0]}
              </div>
              <div className="text-center px-1">
                <div className="text-xs font-semibold text-[var(--bii-text)] truncate max-w-[80px]">{top3[1].name}</div>
                <div className="text-xs text-[var(--bii-emerald)] font-bold">🪙 {BN(top3[1].coins)}</div>
              </div>
              <div className="h-10 w-full bg-slate-200 rounded-b-2xl flex items-center justify-center"><span className="text-xs font-bold text-slate-600">{pick("২য়", "2nd")}</span></div>
            </div>
          )}
          {top3[0] && (
            <div className={`flex flex-col items-center gap-2 flex-1 pb-2 rounded-2xl pt-4 -mt-4 ${top3[0].is_me ? "bg-emerald-50 border-2 border-[var(--bii-emerald)]" : "bg-yellow-50 border border-yellow-200"}`}>
              <RankBadge rank={1} />
              <div className="w-14 h-14 rounded-full bg-yellow-200 flex items-center justify-center text-2xl font-bold text-yellow-700 overflow-hidden ring-2 ring-yellow-400">
                {top3[0].avatar ? <img src={top3[0].avatar} alt="" className="w-full h-full object-cover" /> : top3[0].name[0]}
              </div>
              <div className="text-center px-1">
                <div className="text-xs font-semibold text-[var(--bii-text)] truncate max-w-[80px]">{top3[0].name}</div>
                <div className="text-xs text-[var(--bii-gold)] font-bold">🪙 {BN(top3[0].coins)}</div>
              </div>
              <div className="h-14 w-full bg-yellow-300 rounded-b-2xl flex items-center justify-center"><span className="text-xs font-bold text-yellow-800">{pick("১ম", "1st")}</span></div>
            </div>
          )}
          {top3[2] && (
            <div className={`flex flex-col items-center gap-2 flex-1 pb-2 rounded-2xl pt-4 ${top3[2].is_me ? "bg-emerald-50 border border-emerald-200" : "bg-orange-50"}`}>
              <RankBadge rank={3} />
              <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center text-xl font-bold text-orange-700 overflow-hidden">
                {top3[2].avatar ? <img src={top3[2].avatar} alt="" className="w-full h-full object-cover" /> : top3[2].name[0]}
              </div>
              <div className="text-center px-1">
                <div className="text-xs font-semibold text-[var(--bii-text)] truncate max-w-[80px]">{top3[2].name}</div>
                <div className="text-xs text-amber-600 font-bold">🪙 {BN(top3[2].coins)}</div>
              </div>
              <div className="h-6 w-full bg-orange-200 rounded-b-2xl flex items-center justify-center"><span className="text-xs font-bold text-orange-700">{pick("৩য়", "3rd")}</span></div>
            </div>
          )}
        </div>
      </div>
      {rest.length > 0 && (
        <div className="bii-card overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--bii-emerald)] to-teal-600 px-5 py-3">
            <h3 className="text-white font-semibold text-sm">{pick("সম্পূর্ণ তালিকা", "Full List")}</h3>
          </div>
          <div className="divide-y divide-[var(--bii-border)]">
            {list.map((item) => (
              <div key={item.user_id} className={`flex items-center gap-3 px-4 py-3 ${item.is_me ? "bg-emerald-50" : ""}`}>
                <div className="w-7 flex-shrink-0 flex justify-center"><RankBadge rank={item.rank} /></div>
                <div className="w-9 h-9 rounded-full bg-[var(--bii-cream)] flex items-center justify-center text-sm font-bold text-[var(--bii-emerald)] flex-shrink-0 overflow-hidden">
                  {item.avatar ? <img src={item.avatar} alt="" className="w-full h-full object-cover" /> : item.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--bii-text)] truncate">
                    {item.name} {item.is_me && <span className="text-[var(--bii-emerald)] text-xs">({pick("আপনি", "You")})</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--bii-text-soft)]">
                    <span><Eye size={10} className="inline mr-0.5" />{BN(item.ad_watches)} ভিডিও</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-[var(--bii-emerald)]">🪙 {BN(item.coins)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const { t, pick } = useLang();
  const map = {
    pending:  { label: pick("অপেক্ষমাণ", "Pending"),  cls: "bg-amber-100 text-amber-700",   icon: <Clock size={12} weight="fill" /> },
    approved: { label: t("approved"),                   cls: "bg-green-100 text-green-700",   icon: <CheckFat size={12} weight="fill" /> },
    rejected: { label: t("rejected"),                   cls: "bg-red-100 text-red-600",       icon: <XCircle size={12} weight="fill" /> },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ── Cashout History Tab ─────────────────────────────────────────────────────
function CashoutHistoryTab() {
  const { t, pick } = useLang();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const METHOD_LABEL = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket" };

  useEffect(() => {
    api.get("/rewards/cashout-history")
      .then((r) => setHistory(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-8 h-8 rounded-full border-4 border-[var(--bii-emerald)] border-t-transparent animate-spin" /></div>;

  if (!history.length) return (
    <div className="text-center py-8 px-6 text-[var(--bii-text-soft)]">
      <Money size={48} weight="duotone" className="mx-auto mb-3 text-[var(--bii-emerald)] opacity-40" />
      <p className="font-semibold text-[var(--bii-text)] mb-1">{pick("কোনো ক্যাশআউট নেই", "No cashouts yet")}</p>
      <p className="text-sm">{pick("কয়েন জমান এবং টাকায় রূপান্তর করুন!", "Earn coins and convert to cash!")}</p>
    </div>
  );

  return (
    <div className="space-y-3 pb-8">
      {history.map((req) => (
        <div key={req.id} className="bii-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-bold text-lg text-[var(--bii-emerald)]">৳{req.taka_amount}</div>
              <div className="text-xs text-[var(--bii-text-soft)]">🪙 {BN(req.coins)} কয়েন</div>
            </div>
            <StatusBadge status={req.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--bii-text-soft)] bg-gray-50 rounded-xl px-3 py-2">
            <span className="font-semibold text-[var(--bii-text)]">{METHOD_LABEL[req.payment_method] || req.payment_method}</span>
            <span>—</span>
            <span className="font-mono">{req.payment_number}</span>
          </div>
          {req.admin_note && (
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              📝 {req.admin_note}
            </div>
          )}
          <div className="text-xs text-[var(--bii-text-soft)]">
            {req.created_at ? req.created_at.slice(0, 10) : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function RewardZone() {
  const { adsEnabled } = useAds();
  const { t, pick } = useLang();
  const [tab, setTab] = useState("watch"); // "watch" | "cashout" | "leaderboard" | "history"
  const [moreOpen, setMoreOpen] = useState(false);

  const [stats,     setStats]     = useState(null);
  const [ads,       setAds]       = useState([]);
  const [adIdx,     setAdIdx]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [watching,  setWatching]  = useState(false);
  const [fullScreenAd, setFullScreenAd] = useState(false);
  const [adDone,    setAdDone]    = useState(false);
  const [claiming,  setClaiming]  = useState(false);
  const [cooldown,  setCooldown]  = useState(0);

  // Cashout form state
  const [cashoutCoins,   setCashoutCoins]   = useState("");
  const [cashoutMethod,  setCashoutMethod]  = useState("bkash");
  const [cashoutNumber,  setCashoutNumber]  = useState("");
  const [cashingOut,     setCashingOut]     = useState(false);
  const [cashoutResult,  setCashoutResult]  = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        api.get("/rewards/daily-stats"),
        api.get("/rewards/ads").catch(() => ({ data: [] })),
      ]);
      setStats(sRes.data);
      setCooldown(sRes.data.cooldown_remaining ?? 0);
      setAds(aRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const coins          = stats?.coins          ?? 0;
  const todayCount     = stats?.today_count    ?? 0;
  const unlimited      = stats?.unlimited      ?? true;
  const maxPerDay      = stats?.max_per_day    ?? 0;
  const coinsPerAd     = stats?.coins_per_ad   ?? 5;
  const coinsPerTaka   = stats?.coins_per_taka ?? 10;
  const minCashout     = stats?.min_cashout_coins ?? 100;
  const takaBalance    = Math.floor(coins / coinsPerTaka);

  const canClaim   = cooldown <= 0;
  const currentAd  = ads.length > 0 ? ads[adIdx % ads.length] : null;
  const minimumWatchDuration = stats?.watch_duration_seconds ?? 15;
  const adDuration = Math.max(1, Number(minimumWatchDuration), Number(currentAd?.duration_seconds ?? 0));

  const startAd = () => {
    if (!canClaim || !currentAd) return;
    setWatching(true);
    setAdDone(false);
    setFullScreenAd(true);
  };

  const finishFullScreenAd = useCallback(() => {
    setFullScreenAd(false);
    setAdDone(true);
  }, []);

  const claimCoins = async () => {
    setClaiming(true);
    try {
      const r = await api.post("/rewards/watch-ad");
      toast.success(`🎉 ${BN(r.data.coins_earned)} কয়েন পেয়েছেন!`);
      setWatching(false); setFullScreenAd(false); setAdDone(false); setCooldown(30);
      setAdIdx((i) => i + 1);
      await loadAll();
    } catch (e) {
      toast.error(formatApiError(e));
      setWatching(false); setFullScreenAd(false);
    } finally { setClaiming(false); }
  };

  const submitCashout = async () => {
    const coinsNum = parseInt(cashoutCoins);
    if (!coinsNum || coinsNum < minCashout) {
      toast.error(`সর্বনিম্ন ${BN(minCashout)} কয়েন (৳${minCashout / coinsPerTaka}) ক্যাশআউট করা যাবে`);
      return;
    }
    if (coinsNum % coinsPerTaka !== 0) {
      toast.error(`কয়েনের পরিমাণ ${BN(coinsPerTaka)}-এর গুণিতক হতে হবে (যেমন: ${BN(minCashout)}, ${BN(minCashout * 2)}, …)`);
      return;
    }
    if (!cashoutNumber.trim()) {
      toast.error("মোবাইল নম্বর দিন");
      return;
    }
    setCashingOut(true);
    setCashoutResult(null);
    try {
      const r = await api.post("/rewards/cashout", {
        coins:          coinsNum,
        payment_method: cashoutMethod,
        payment_number: cashoutNumber.trim(),
      });
      setCashoutResult(r.data);
      setCashoutCoins("");
      setCashoutNumber("");
      toast.success(`✅ ক্যাশআউট রিকোয়েস্ট জমা হয়েছে! ৳${r.data.taka_amount} পাঠানো হবে।`);
      await loadAll();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setCashingOut(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-10 h-10 rounded-full border-4 border-[var(--bii-emerald)] border-t-transparent animate-spin" />
    </div>
  );

  const coinsNum = parseInt(cashoutCoins) || 0;
  const takaPreview = coinsNum >= coinsPerTaka ? Math.floor(coinsNum / coinsPerTaka) : 0;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-16 sm:pb-24">

      {fullScreenAd && currentAd && (
        <FullScreenAdOverlay
          ad={{ ...currentAd, duration_seconds: adDuration }}
          onComplete={finishFullScreenAd}
          title={currentAd.title || "বিজ্ঞাপন"}
          skipLabel="দেখা শেষ করুন"
          minDuration={adDuration}
        />
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--bii-emerald)] via-emerald-600 to-teal-700 text-white px-6 pt-8 pb-6 text-center">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-[var(--bii-gold)]/10 blur-2xl" />
        <div className="relative">
          <div className="text-5xl mb-3">🎬</div>
          <h1 className="font-heading text-2xl font-bold mb-1">{pick("ভিডিও দেখে টাকা ইনকাম করুন!", "Earn Money Watching Videos!")}</h1>
          <p className="text-white/75 text-sm">{pick("ভিডিও দেখুন → কয়েন জমান → সরাসরি টাকা তুলুন", "Watch Videos → Earn Coins → Withdraw Cash")}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold">
            🪙 {BN(coinsPerTaka)} কয়েন = ৳১
          </div>
        </div>

        {/* Coin + Taka balance */}
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur rounded-2xl px-5 py-3">
            <div className="text-3xl">🪙</div>
            <div className="text-left">
              <div className="font-heading text-3xl font-bold leading-none">{BN(coins)}</div>
              <div className="text-white/70 text-xs">{t("coinBalance")}</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur rounded-2xl px-5 py-3">
            <div className="text-3xl">💵</div>
            <div className="text-left">
              <div className="font-heading text-3xl font-bold leading-none">৳{BN(takaBalance)}</div>
              <div className="text-white/70 text-xs">{t("takaValue")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="relative flex bg-[var(--bii-cream)] rounded-2xl p-1 gap-1">
        {[
          { id: "watch",       label: t("watchVideosTab"), icon: <PlayCircle size={15} weight="fill" /> },
          { id: "leaderboard", label: t("rankingLabel"),   icon: <Trophy     size={15} weight="fill" /> },
          { id: "history",     label: t("historyLabel"),   icon: <Clock      size={15} weight="fill" /> },
        ].map((item) => (
          <button key={item.id} onClick={() => { setTab(item.id); setMoreOpen(false); }}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${
              tab === item.id
                ? "bg-white text-[var(--bii-emerald)] shadow-sm"
                : "text-[var(--bii-text-soft)] hover:text-[var(--bii-text)]"
            }`}>
            {item.icon}{item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-label={pick("আরও অপশন", "More options")}
          aria-expanded={moreOpen}
          className={`w-11 flex items-center justify-center rounded-xl transition-all ${
            tab === "cashout" || moreOpen
              ? "bg-white text-[var(--bii-emerald)] shadow-sm"
              : "text-[var(--bii-text-soft)] hover:text-[var(--bii-text)]"
          }`}
        >
          <DotsThreeVertical size={21} weight="bold" />
        </button>
        {moreOpen && (
          <div className="absolute right-1 top-full mt-2 z-20 min-w-44 rounded-xl border border-[var(--bii-border)] bg-white p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => { setTab("cashout"); setMoreOpen(false); }}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                tab === "cashout"
                  ? "bg-emerald-50 text-[var(--bii-emerald)]"
                  : "text-[var(--bii-text)] hover:bg-[var(--bii-cream)]"
              }`}
            >
              <Money size={16} weight="fill" />
              {t("cashout")}
            </button>
          </div>
        )}
      </div>

      {/* ══ Tab: Watch ══ */}
      {tab === "watch" && (
        <>
          {/* Today's watch count (info only, no limit) */}
          <div className="bii-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fire size={18} weight="fill" className="text-orange-500" />
                <span className="font-semibold text-sm text-[var(--bii-text)]">{pick("আজকের পরিসংখ্যান", "Today's Stats")}</span>
              </div>
              <span className="text-sm font-bold px-3 py-0.5 rounded-full bg-emerald-50 text-[var(--bii-emerald)]">
                {BN(todayCount)} {pick("ভিডিও দেখেছেন", "videos watched")}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700">
              <CheckFat size={14} weight="fill" className="text-green-600 flex-shrink-0" />
              <span>কোনো সীমাবদ্ধতা নেই — যত খুশি ভিডিও দেখুন, যত খুশি ইনকাম করুন!</span>
            </div>
            <div className="mt-2 text-xs text-[var(--bii-text-soft)] text-center">
              আজ আয় করেছেন: <span className="font-bold text-[var(--bii-emerald)]">🪙 {BN(todayCount * coinsPerAd)}</span> = <span className="font-bold text-green-600">৳{Math.floor(todayCount * coinsPerAd / coinsPerTaka)}</span>
            </div>
          </div>

          {/* Ad info strip */}
          {ads.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
              <FilmSlate size={14} weight="fill" className="flex-shrink-0" />
              <span>{BN(ads.length)}টি ভিডিও পাওয়া গেছে — প্রতিটি দেখলে +{BN(coinsPerAd)} 🪙</span>
              <button onClick={loadAll} className="ml-auto hover:opacity-70 transition">
                <ArrowClockwise size={14} />
              </button>
            </div>
          )}

          {/* Watch card */}
          <div className="bii-card overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">১</span>
              <span className="text-white font-semibold">ভিডিও দেখুন — কয়েন পান</span>
              <span className="ml-auto text-white/80 text-xs">প্রতিটিতে +{BN(coinsPerAd)} 🪙</span>
            </div>
            <div className="p-5 space-y-4">
              {watching ? (
                <div className="space-y-4">
                  {currentAd && (
                    <div className="flex items-center gap-2 text-xs text-[var(--bii-text-soft)]">
                      {currentAd.ad_type === "youtube" && <YoutubeLogo size={14} className="text-red-500" />}
                      {currentAd.ad_type === "video"   && <VideoCamera size={14} className="text-blue-500" />}
                      {currentAd.ad_type === "image"   && <ImageIcon   size={14} className="text-purple-500" />}
                      {currentAd.ad_type === "link"    && <LinkIcon    size={14} className="text-cyan-500" />}
                      <span className="truncate">{currentAd.title}</span>
                    </div>
                  )}
                  <AdPlayer ad={currentAd} adsEnabled={adsEnabled} />
                  <div className="flex items-center gap-4">
                    {!adDone
                      ? <CircleCountdown total={adDuration} onDone={() => setAdDone(true)} />
                      : (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={32} weight="fill" />
                          <span className="font-semibold text-sm">দেখা সম্পন্ন!</span>
                        </div>
                      )
                    }
                    <div className="flex-1 text-sm text-[var(--bii-text-soft)]">
                      {adDone ? "নিচের বাটনে ক্লিক করে কয়েন নিন।" : "নির্ধারিত সময় শেষ হলে কয়েন নিন বাটন সক্রিয় হবে।"}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setWatching(false); setFullScreenAd(false); setAdDone(false); }}
                      className="px-4 py-2 rounded-xl border border-[var(--bii-border)] text-sm text-red-500 hover:bg-red-50 transition">
                      বাতিল
                    </button>
                    <button onClick={claimCoins} disabled={!adDone || claiming}
                      className="flex-1 py-2.5 rounded-xl bg-[var(--bii-emerald)] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition active:scale-95">
                      {claiming ? "সংগ্রহ হচ্ছে…" : <><Trophy size={18} weight="fill" /> {BN(coinsPerAd)} কয়েন নিন</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentAd && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        currentAd.ad_type === "youtube" ? "bg-red-100 text-red-600" :
                        currentAd.ad_type === "video"   ? "bg-blue-100 text-blue-600" :
                        currentAd.ad_type === "link"    ? "bg-cyan-100 text-cyan-600" :
                                                          "bg-purple-100 text-purple-600"
                      }`}>
                        {currentAd.ad_type === "youtube" ? <YoutubeLogo size={18} weight="fill" /> :
                         currentAd.ad_type === "video"   ? <VideoCamera size={18} weight="fill" /> :
                         currentAd.ad_type === "link"    ? <LinkIcon size={18} weight="bold" /> :
                                                           <ImageIcon   size={18} weight="fill" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--bii-text)] truncate">{currentAd.title}</div>
                        <div className="text-xs text-[var(--bii-text-soft)]">⏱ {BN(adDuration)} সেকেন্ড দেখতে হবে</div>
                      </div>
                    </div>
                  )}
                  {cooldown > 0
                    ? <CooldownTimer seconds={cooldown} onDone={() => setCooldown(0)} />
                    : null}
                  <button onClick={startAd} disabled={!canClaim || !currentAd}
                    className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all ${
                      canClaim
                        ? "bg-gradient-to-r from-[var(--bii-emerald)] to-emerald-500 text-white shadow-lg shadow-emerald-200 hover:opacity-90 active:scale-95"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}>
                    <PlayCircle size={26} weight="fill" />
                    {cooldown > 0 ? "অপেক্ষা করুন…" : `ভিডিও দেখুন — +${BN(coinsPerAd)} কয়েন`}
                  </button>
                  {!ads.length && (
                    <p className="text-center text-xs text-[var(--bii-text-soft)]">
                      এখন কোনো ভিডিও নেই। পরে আবার চেষ্টা করুন।
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="bii-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star size={18} weight="fill" className="text-[var(--bii-gold)]" />
              <h3 className="font-heading text-base text-[var(--bii-emerald)]">{pick("কীভাবে কাজ করে?", "How does it work?")}</h3>
            </div>
            <div className="space-y-3">
              {[
                { icon: "🎬", title: pick("ভিডিও দেখুন", "Watch Videos"),     desc: pick(`প্রতিটি ভিডিও দেখলে ${coinsPerAd} কয়েন পাবেন — কোনো লিমিট নেই!`, `Earn ${coinsPerAd} coins per video — no limit!`) },
                { icon: "🪙", title: pick("কয়েন জমান", "Earn Coins"),       desc: pick(`১০ কয়েন = ৳১ — যত বেশি কয়েন তত বেশি টাকা`, `10 coins = ৳1 — more coins, more money`) },
                { icon: "💵", title: pick("টাকা তুলুন", "Withdraw Cash"),   desc: pick(`থ্রি-ডট মেনু থেকে ক্যাশআউট করে bKash/Nagad/Rocket-এ টাকা নিন`, `Open the three-dot menu to cash out to bKash/Nagad/Rocket`) },
                { icon: "♾️", title: pick("কোনো সীমা নেই", "No Limit"),     desc: pick("যত খুশি ভিডিও দেখুন, যত ইচ্ছা ইনকাম করুন", "Watch as many videos as you want, earn unlimited") },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bii-cream)]">
                  <span className="text-2xl flex-shrink-0">{s.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-[var(--bii-text)]">{s.title}</div>
                    <div className="text-xs text-[var(--bii-text-soft)] mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ Tab: Cashout ══ */}
      {tab === "cashout" && (
        <div className="space-y-4 pb-8">
          {/* Rate info */}
          <div className="bii-card p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="text-3xl font-bold text-[var(--bii-emerald)]">🪙 {BN(coins)}</div>
                <div className="text-xs text-[var(--bii-text-soft)] mt-1">আপনার কয়েন</div>
              </div>
              <ArrowRight size={24} weight="bold" className="text-[var(--bii-emerald)]" />
              <div>
                <div className="text-3xl font-bold text-green-600">৳{BN(takaBalance)}</div>
                <div className="text-xs text-[var(--bii-text-soft)] mt-1">সর্বোচ্চ তোলা যাবে</div>
              </div>
            </div>
            <div className="mt-4 text-center text-xs text-[var(--bii-text-soft)] bg-white/70 rounded-xl py-2 px-4">
              হিসাব: {BN(coinsPerTaka)} কয়েন = ৳১ &nbsp;|&nbsp; সর্বনিম্ন ক্যাশআউট: {BN(minCashout)} কয়েন (৳{minCashout / coinsPerTaka})
            </div>
          </div>

          {/* Cashout form */}
          <div className="bii-card p-5 space-y-4">
            <h3 className="font-semibold text-[var(--bii-text)] flex items-center gap-2">
              <Money size={18} weight="fill" className="text-[var(--bii-emerald)]" />
              টাকা উত্তোলন করুন
            </h3>

            {/* Coins input */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
                কত কয়েন ক্যাশআউট করবেন?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🪙</span>
                <input
                  className="bii-input pl-8"
                  type="number"
                  min={minCashout}
                  step={coinsPerTaka}
                  placeholder={`সর্বনিম্ন ${minCashout}`}
                  value={cashoutCoins}
                  onChange={(e) => setCashoutCoins(e.target.value)}
                />
              </div>
              {coinsNum > 0 && coinsNum <= coins && coinsNum % coinsPerTaka === 0 && (
                <div className="mt-1.5 text-xs text-green-600 font-semibold">
                  ✓ আপনি পাবেন: ৳{takaPreview}
                </div>
              )}
              {coinsNum > coins && (
                <div className="mt-1.5 text-xs text-red-500">পর্যাপ্ত কয়েন নেই (আপনার: {BN(coins)})</div>
              )}
              {/* Quick pick buttons */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {[100, 200, 500, 1000].filter(v => v <= coins).map(v => (
                  <button key={v} onClick={() => setCashoutCoins(String(v))}
                    className="text-xs px-3 py-1 rounded-full border border-[var(--bii-emerald)] text-[var(--bii-emerald)] hover:bg-emerald-50 transition">
                    {BN(v)} কয়েন
                  </button>
                ))}
                {coins >= minCashout && (
                  <button onClick={() => setCashoutCoins(String(Math.floor(coins / coinsPerTaka) * coinsPerTaka))}
                    className="text-xs px-3 py-1 rounded-full bg-[var(--bii-emerald)] text-white hover:opacity-80 transition">
                    সব তুলুন
                  </button>
                )}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs font-semibold mb-2 text-[var(--bii-text-soft)]">পেমেন্ট মেথড</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "bkash",  label: "bKash",  emoji: "🟣" },
                  { value: "nagad",  label: "Nagad",  emoji: "🟠" },
                  { value: "rocket", label: "Rocket", emoji: "🔵" },
                ].map((m) => (
                  <button key={m.value} onClick={() => setCashoutMethod(m.value)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                      cashoutMethod === m.value
                        ? "border-[var(--bii-emerald)] bg-emerald-50 text-[var(--bii-emerald)]"
                        : "border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-emerald-300"
                    }`}>
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account number */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
                মোবাইল নম্বর ({cashoutMethod === "bkash" ? "bKash" : cashoutMethod === "nagad" ? "Nagad" : "Rocket"})
              </label>
              <input
                className="bii-input"
                type="tel"
                placeholder="01XXXXXXXXX"
                value={cashoutNumber}
                onChange={(e) => setCashoutNumber(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button onClick={submitCashout}
              disabled={cashingOut || coins < minCashout}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 bg-gradient-to-r from-[var(--bii-emerald)] to-teal-500 text-white shadow-lg shadow-emerald-200 hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {cashingOut
                ? <><Spinner size={22} className="animate-spin" /> প্রসেস হচ্ছে…</>
                : <><Money size={22} weight="fill" /> ক্যাশআউট রিকোয়েস্ট করুন</>}
            </button>

            {coins < minCashout && (
              <p className="text-center text-xs text-[var(--bii-text-soft)]">
                আরও <span className="font-bold text-[var(--bii-emerald)]">{BN(minCashout - coins)}</span> কয়েন দরকার। ভিডিও দেখুন!
              </p>
            )}
          </div>

          {/* Cashout result */}
          {cashoutResult && (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center space-y-2">
              <CheckCircle size={40} weight="fill" className="text-green-600 mx-auto" />
              <p className="font-bold text-green-800 text-lg">রিকোয়েস্ট সফল!</p>
              <p className="text-sm text-green-700">
                ৳{cashoutResult.taka_amount} পাঠানো হবে। অ্যাডমিন অনুমোদন করলে সরাসরি পেমেন্ট পাবেন।
              </p>
              <div className="flex gap-2 justify-center pt-1">
                <button onClick={() => { setCashoutResult(null); setTab("history"); }}
                  className="text-sm text-[var(--bii-emerald)] underline">ইতিহাস দেখুন</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setCashoutResult(null)} className="text-sm text-[var(--bii-emerald)] underline">আরও তুলুন</button>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
            <Warning size={14} weight="fill" className="mt-0.5 flex-shrink-0" />
            <span>রিকোয়েস্ট জমার পর অ্যাডমিন রিভিউ করে ১-২ কার্যদিবসের মধ্যে পেমেন্ট পাঠাবেন। কয়েন অবিলম্বে কাটা হবে।</span>
          </div>
        </div>
      )}

      {/* ══ Tab: Leaderboard ══ */}
      {tab === "leaderboard" && <LeaderboardTab />}

      {/* ══ Tab: Cashout History ══ */}
      {tab === "history" && <CashoutHistoryTab />}
      <BottomBanner slot="reward-zone-bottom" />
    </div>
  );
}
