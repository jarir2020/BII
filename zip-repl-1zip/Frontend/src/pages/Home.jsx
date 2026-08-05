import React, { useEffect, useState, useCallback } from "react";
import AdBanner from "../components/AdBanner";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Books, GraduationCap, VideoCamera, FilmSlate, Trophy, Storefront,
  Bell, PhoneCall, Question, HandsPraying, Star, PlayCircle, MapPin,
  Gift, Medal, BookOpen,
  FacebookLogo, YoutubeLogo, InstagramLogo, TwitterLogo,
  LinkedinLogo, TelegramLogo, TiktokLogo, WhatsappLogo
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl } from "../lib/api";

const SOCIAL_META = [
  { key: "facebook",         label: "Facebook",   Icon: FacebookLogo,  bg: "#1877F2" },
  { key: "youtube",          label: "YouTube",    Icon: YoutubeLogo,   bg: "#FF0000" },
  { key: "tiktok",           label: "TikTok",     Icon: TiktokLogo,    bg: "#010101" },
  { key: "instagram",        label: "Instagram",  Icon: InstagramLogo, bg: "#E1306C" },
  { key: "twitter",          label: "Twitter/X",  Icon: TwitterLogo,   bg: "#1DA1F2" },
  { key: "telegram",         label: "Telegram",   Icon: TelegramLogo,  bg: "#229ED9" },
  { key: "linkedin",         label: "LinkedIn",   Icon: LinkedinLogo,  bg: "#0A66C2" },
  { key: "whatsapp_channel", label: "WhatsApp",   Icon: WhatsappLogo,  bg: "#25D366" },
];

const PLACEHOLDER_AVATAR = "/placeholder-avatar.jpg";
const RANK_EMOJI = { 1: "🥇", 2: "🥈", 3: "🥉" };
const RANK_BN = { 1: "১ম", 2: "২য়", 3: "৩য়" };

function StarRating({ rating = 5 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={16}
          weight={s <= rating ? "fill" : "regular"}
          className={s <= rating ? "text-yellow-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

function ReviewCard({ r }) {
  const { t, pick } = useLang();
  const [lightbox, setLightbox] = useState(false);
  const rank = r.rank || 1;

  const getVideoEmbed = (url) => {
    if (!url) return null;
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const fb = url.match(/facebook\.com\/.*\/videos\/(\d+)/);
    if (fb) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
    return url;
  };

  const embedUrl = getVideoEmbed(r.video_url);

  return (
    <>
      <div className="bii-card h-full flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
        {/* Photo */}
        <div
          className="relative aspect-[4/3] overflow-hidden cursor-pointer bg-[var(--bii-cream)]"
          onClick={() => r.winner_photo && setLightbox(true)}
        >
          <img
            src={imgUrl(r.winner_photo) || PLACEHOLDER_AVATAR}
            alt={r.winner_name}
            onError={(e) => { e.target.src = PLACEHOLDER_AVATAR; }}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
          {/* Rank badge */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow text-sm font-bold">
            <span>{RANK_EMOJI[rank] || "🏆"}</span>
            <span className="text-[var(--bii-emerald)]">{pick(RANK_BN[rank] || `${rank}তম`, `#${rank}`)} {pick("স্থান", "place")}</span>
          </div>
          {/* Video play icon */}
          {r.video_url && (
            <div className="absolute bottom-3 right-3 bg-black/60 rounded-full p-1.5">
              <PlayCircle size={22} weight="fill" className="text-white" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col gap-2">
          {/* Name + meta */}
          <div>
            <div className="font-heading text-base text-[var(--bii-text)] leading-snug">{r.winner_name}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-[var(--bii-text-soft)]">
              {r.district && (
                <span className="flex items-center gap-1"><MapPin size={12} /> {r.district}</span>
              )}
              {r.month && (
                <span className="flex items-center gap-1"><Medal size={12} /> {r.month}</span>
              )}
            </div>
          </div>

          {/* Prize */}
          {r.prize && (
            <div className="flex items-center gap-1.5 text-sm bg-[var(--bii-gold)]/10 text-[var(--bii-gold)] rounded-lg px-3 py-1.5 font-medium">
              <Gift size={16} weight="fill" />
              {r.prize}
            </div>
          )}

          {/* Rating */}
          <StarRating rating={r.rating ?? 5} />

          {/* Review text */}
          {r.review_text && (
            <blockquote className="text-sm text-[var(--bii-text-soft)] italic leading-relaxed border-l-2 border-[var(--bii-emerald)]/40 pl-3 line-clamp-4">
              "{r.review_text}"
            </blockquote>
          )}

          {/* Video link */}
          {r.video_url && (
            <a
              href={r.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex items-center gap-1.5 text-sm text-[var(--bii-emerald)] font-semibold hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <PlayCircle size={18} weight="fill" />
              {t("watchVideoReview")}
            </a>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={imgUrl(r.winner_photo)}
            alt={r.winner_name}
            onError={(e) => { e.target.src = PLACEHOLDER_AVATAR; }}
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}

function WinnerReviews({ reviews }) {
  const { t, pick } = useLang();
  const [idx, setIdx] = useState(0);
  const visible = reviews.filter((r) => r.is_visible !== false);
  const total = visible.length;

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  // Touch swipe
  const touchStart = React.useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStart.current = null;
  };

  if (total === 0) return null;

  // Show 1 on mobile, up to 2 on sm, up to 3 on lg
  const getVisible = () => {
    const out = [];
    for (let i = 0; i < Math.min(3, total); i++) {
      out.push(visible[(idx + i) % total]);
    }
    return out;
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="font-heading text-xl">🏆 {t("winnersReview")}</h2>
          <p className="text-xs text-[var(--bii-text-soft)] mt-0.5">
            {pick(`এখন পর্যন্ত`, `So far`)} <span className="font-semibold text-[var(--bii-emerald)]">{total} {pick("জন", "winners")}</span> {pick("পুরস্কার পেয়েছেন", "have received prizes")}
          </p>
        </div>
        {total > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="w-8 h-8 rounded-full border border-[var(--bii-border)] flex items-center justify-center text-[var(--bii-text-soft)] hover:bg-[var(--bii-emerald)] hover:text-white hover:border-[var(--bii-emerald)] transition"
              aria-label="আগের রিভিউ"
            >‹</button>
            <span className="text-xs text-[var(--bii-text-soft)]">{idx + 1}/{total}</span>
            <button
              onClick={next}
              className="w-8 h-8 rounded-full border border-[var(--bii-border)] flex items-center justify-center text-[var(--bii-text-soft)] hover:bg-[var(--bii-emerald)] hover:text-white hover:border-[var(--bii-emerald)] transition"
              aria-label="পরের রিভিউ"
            >›</button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {getVisible().map((r, i) => (
          <motion.div
            key={`${r.id}-${idx}-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className={i === 0 ? "" : i === 1 ? "hidden sm:block" : "hidden lg:block"}
          >
            <ReviewCard r={r} />
          </motion.div>
        ))}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {visible.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-[var(--bii-emerald)] w-5" : "bg-[var(--bii-border)]"}`}
              aria-label={`রিভিউ ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { t, pick } = useLang();
  const [reviews, setReviews]     = useState([]);
  const [social, setSocial]       = useState({});
  const [settings, setSettings]   = useState({});

  useEffect(() => {
    api.get("/winner_reviews").then((r) => {
      const sorted = [...(r.data || [])].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
      setReviews(sorted);
    }).catch(() => {});
    api.get("/configs/social_links").then((r) => setSocial(r.data || {})).catch(() => {});
    api.get("/settings").then((r) => setSettings(r.data || {})).catch(() => {});
  }, []);

  const mergedSocial = {
    facebook: settings.facebook || "",
    youtube:  settings.youtube  || "",
    ...social,
  };
  const activeSocials = SOCIAL_META.filter((s) => mergedSocial[s.key]?.trim());

  const menu = [
    { to: "/courses", label: t("menuOurCourses"), icon: <Books size={36} weight="duotone" />, testid: "menu-our-courses" },
    { to: "/my-courses", label: t("menuMyCourses"), icon: <GraduationCap size={36} weight="duotone" />, testid: "menu-my-courses" },
    { to: "/live-classes", label: t("menuLiveClass"), icon: <VideoCamera size={36} weight="duotone" />, testid: "menu-live-class" },
    { to: "/videos", label: t("menuVideos"), icon: <FilmSlate size={36} weight="duotone" />, testid: "menu-videos" },
    { to: "/dua", label: t("menuDua"), icon: <HandsPraying size={36} weight="duotone" />, testid: "menu-dua" },
    { to: "/quiz", label: t("menuQuiz"), icon: <Trophy size={36} weight="duotone" />, testid: "menu-quiz" },
    { to: "/reward-zone", label: `${t("menuRewardZone")} 💵`, icon: <Gift size={36} weight="duotone" />, testid: "menu-reward-zone", highlight: true },
    { to: "/shop", label: t("menuShop"), icon: <Storefront size={36} weight="duotone" />, testid: "menu-shop" },
    { to: "/library", label: t("menuLibrary"), icon: <BookOpen size={36} weight="duotone" />, testid: "menu-library" },
    { to: "/notifications", label: t("menuNotifications"), icon: <Bell size={36} weight="duotone" />, testid: "menu-notifications" },
    { to: "/contact", label: t("menuContact"), icon: <PhoneCall size={36} weight="duotone" />, testid: "menu-contact" },
    { to: "/complaint", label: t("menuComplaint"), icon: <Question size={36} weight="duotone" />, testid: "menu-complaint" },
  ];

  return (
    <div className="space-y-5" data-testid="home-page">
      {/* PROFILE BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--bii-emerald)] text-white">
        <div className="islamic-pattern absolute inset-0 opacity-25" />
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[var(--bii-gold)]/10 blur-3xl" />
        <div className="relative px-6 py-10 flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-1 ring-4 ring-[var(--bii-gold)]/80 shadow-xl">
              <img
                src={imgUrl(user?.profile_photo) || PLACEHOLDER_AVATAR}
                onError={(e) => { e.target.src = PLACEHOLDER_AVATAR; }}
                alt="profile"
                className="w-full h-full object-cover rounded-full"
                data-testid="home-profile-photo"
              />
            </div>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl mt-4">
            {`${t("welcome")}, ${user?.name || user?.email || ""}`}
          </h1>
          <div className="mt-2 inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm">
            <span className="text-[var(--bii-gold)] uppercase tracking-wider text-[11px]">{t("studentId")}</span>
            <span className="font-mono" data-testid="home-student-id">{user?.student_id || "—"}</span>
          </div>
        </div>
      </section>

      {/* GRID MENU */}
      <section>
        <h2 className="font-heading text-xl mb-4 px-1">
          {pick("মেনু", "Menu")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {menu.map((m, i) => (
            <motion.div
              key={m.to}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
            >
              <Link
                to={m.to}
                data-testid={m.testid}
                className={`flex flex-col items-center justify-center text-center p-5 h-full min-h-[140px] rounded-2xl transition-all ${
                  m.highlight
                    ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-400/40 hover:opacity-90 active:scale-95"
                    : "bii-card"
                }`}
              >
                <div className={`mb-2 ${m.highlight ? "text-white" : "text-[var(--bii-emerald)]"}`}>{m.icon}</div>
                <div className={`font-heading text-base sm:text-lg leading-tight ${m.highlight ? "text-white font-bold" : "text-[var(--bii-text)]"}`}>
                  {m.label}
                </div>
                {m.highlight && (
                  <span className="mt-1.5 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold tracking-wide">
                    {t("newFeature")} ✨
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ad banner between menu grid and winner reviews */}
      <AdBanner slot="home-mid" format="responsive" />

      {/* WINNER REVIEWS */}
      <WinnerReviews reviews={reviews} />

      {/* SOCIAL MEDIA — rendered in the global footer (Layout.jsx) */}
    </div>
  );
}
