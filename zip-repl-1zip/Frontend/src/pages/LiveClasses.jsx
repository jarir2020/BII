import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  VideoCamera, ArrowSquareOut, CalendarBlank, Clock,
  Info, LinkSimple, BookOpen, Play, MicrophoneStage,
  LockSimple, GlobeSimple,
} from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

// re-export pick helper from hook — sub-components call useLang() directly

// ── helpers ───────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("bn-BD", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function isUpcoming(iso) {
  if (!iso) return true;
  return new Date(iso) > new Date();
}

function isLiveNow(iso) {
  if (!iso) return false;
  const diff = (new Date(iso) - new Date()) / 1000 / 60; // minutes
  return diff > -120 && diff < 30;
}

// ── How-to-join steps ─────────────────────────────────────────
function ZoomSteps() {
  const { t, pick } = useLang();
  const steps = [
    pick('আপনার ডিভাইসে Zoom অ্যাপ ইন্সটল করুন (zoom.us থেকে বিনামূল্যে পাওয়া যায়)।', 'Install the Zoom app on your device (free from zoom.us).'),
    pick('নিচের "ক্লাসে যোগ দিন" বাটনে ক্লিক করুন।', 'Click the "Join Class" button below.'),
    pick('Zoom অ্যাপ খুলবে — "Join" বাটনে ক্লিক করুন।', 'The Zoom app will open — click "Join".'),
    pick('হোস্ট ক্লাস শুরু করলে আপনি স্বয়ংক্রিয়ভাবে প্রবেশ করতে পারবেন।', 'You will automatically enter once the host starts the class.'),
  ];
  return (
    <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
      <div className="flex items-center gap-2 mb-3 text-blue-700">
        <Info size={16} weight="fill" />
        <span className="text-xs font-semibold uppercase tracking-wider">{t("howToJoin")}</span>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-xs text-blue-800 leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-[10px] mt-0.5">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Single Live Class Card ────────────────────────────────────
function LiveClassCard({ lc }) {
  const { t, pick } = useLang();
  const upcoming = isUpcoming(lc.scheduled_at);
  const liveNow = isLiveNow(lc.scheduled_at);
  const isFree = !!lc.is_free;
  const [showSteps, setShowSteps] = useState(false);

  const borderClass = isFree
    ? "border-l-4 border-amber-400"
    : liveNow
      ? "border-2 border-[var(--bii-emerald)] shadow-lg"
      : upcoming
        ? "border-l-4 border-[var(--bii-emerald)]"
        : "opacity-75";

  const headerBg = liveNow && !isFree
    ? "bg-emerald-600"
    : isFree
      ? "bg-amber-50"
      : upcoming ? "bg-emerald-50" : "bg-gray-50";

  const statusLabel = liveNow && !isFree
    ? `🔴 ${t("liveNow")}`
    : isFree
      ? `🎁 ${t("freeClass")}`
      : upcoming ? pick("আসন্ন লাইভ ক্লাস", "Upcoming Live Class") : t("completedClass");

  const labelColor = liveNow && !isFree
    ? "text-white"
    : isFree
      ? "text-amber-700"
      : upcoming ? "text-[var(--bii-emerald)]" : "text-gray-400";

  return (
    <div className={`bii-card overflow-hidden transition-shadow ${borderClass}`}>
      {/* Top bar */}
      <div className={`px-5 py-3 flex items-center justify-between gap-2 ${headerBg}`}>
        <div className="flex items-center gap-2">
          {isFree
            ? <GlobeSimple size={18} weight="fill" className="text-amber-600" />
            : <VideoCamera size={18} weight="fill" className={liveNow ? "text-white" : upcoming ? "text-[var(--bii-emerald)]" : "text-gray-400"} />
          }
          <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isFree && (
            <span className="text-[10px] bg-amber-400 text-white px-2 py-0.5 rounded-full font-bold">
              {pick("সবার জন্য", "For All")}
            </span>
          )}
          {liveNow && !isFree && (
            <span className="text-[10px] bg-white text-emerald-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
              LIVE NOW
            </span>
          )}
          {!liveNow && upcoming && !isFree && (
            <span className="text-[10px] bg-[var(--bii-emerald)] text-white px-2 py-0.5 rounded-full font-medium">
              {pick("আসছে", "Coming")}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="font-heading text-xl text-[var(--bii-emerald)] leading-snug mb-1">
          {lc.title_bn || lc.title_en}
        </h3>
        {lc.title_en && lc.title_bn && (
          <p className="text-xs text-[var(--bii-text-soft)] italic mb-3">{lc.title_en}</p>
        )}

        {/* Free label */}
        {isFree && (
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-3">
            <GlobeSimple size={13} weight="fill" />
            যেকোনো লগইনকৃত সদস্য এই ক্লাসে যোগ দিতে পারবেন
          </div>
        )}

        {/* Date & time */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-[var(--bii-text-soft)]">
            <CalendarBlank size={15} className="text-[var(--bii-gold)]" />
            <span>{formatDate(lc.scheduled_at)}</span>
          </div>
          {!isFree && lc.course_id && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--bii-text-soft)]">
              <BookOpen size={13} className="text-[var(--bii-gold)]" />
              <span>{pick("কোর্স-ভিত্তিক ক্লাস", "Course-based class")}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {lc.description && (
          <p className="text-sm text-[var(--bii-text)] leading-relaxed mb-4 border-l-2 border-[var(--bii-gold)] pl-3">
            {lc.description}
          </p>
        )}

        {/* Zoom link preview */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bii-cream)] border border-[var(--bii-border)] mb-4">
          <LinkSimple size={16} className="text-[var(--bii-gold)] flex-shrink-0" />
          <span className="text-xs text-[var(--bii-text-soft)] truncate flex-1 font-mono">
            {lc.join_url}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <a
            href={lc.join_url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl font-semibold text-sm transition ${
              isFree
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bii-btn-primary"
            }`}
          >
            <VideoCamera size={17} weight="fill" />
            {t("joinClass")}
            <ArrowSquareOut size={15} weight="bold" />
          </a>
          <button
            onClick={() => setShowSteps((v) => !v)}
            className="px-4 py-2 rounded-xl border border-[var(--bii-border)] text-sm text-[var(--bii-text-soft)] hover:bg-[var(--bii-cream)] hover:text-[var(--bii-emerald)] transition"
          >
            {showSteps ? t("hide") : t("howToJoin")}
          </button>
        </div>

        {showSteps && <ZoomSteps />}
      </div>
    </div>
  );
}

// ── Hero Banner ───────────────────────────────────────────────
function HeroBanner({ liveCount, hasFree }) {
  const { t, pick } = useLang();
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--bii-emerald)] via-emerald-700 to-emerald-900 p-6 sm:p-8 text-white">
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 -left-6 w-52 h-52 rounded-full bg-white/5" />

      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
          <MicrophoneStage size={32} weight="duotone" className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-white leading-tight">
            {t("menuLiveClass")}
          </h1>
          <p className="text-white/70 text-sm mt-0.5">
            {hasFree
              ? pick("ফ্রি ও কোর্স-ভিত্তিক Zoom ক্লাস — সরাসরি যোগ দিন", "Free & course-based Zoom classes — join directly")
              : pick("আপনার কোর্সের Zoom ক্লাস — শুধুমাত্র ভর্তি শিক্ষার্থীদের জন্য", "Your course Zoom classes — enrolled students only")}
          </p>
        </div>
        {liveCount > 0 && (
          <div className="ml-auto flex-shrink-0 text-center bg-white/10 rounded-xl px-4 py-2">
            <div className="font-heading text-2xl text-white">{liveCount}</div>
            <div className="text-xs text-white/70">{t("liveNow")}</div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          { icon: <Play size={18} weight="fill" />, label: pick("বাটনে ক্লিক করুন", "Click the button") },
          { icon: <VideoCamera size={18} weight="fill" />, label: pick("Zoom খুলবে", "Zoom will open") },
          { icon: <MicrophoneStage size={18} weight="fill" />, label: pick("ক্লাসে প্রবেশ করুন", "Enter the class") },
        ].map((s, i) => (
          <div key={i} className="bg-white/10 rounded-xl py-2.5 px-2 flex flex-col items-center gap-1">
            <span className="text-white/80">{s.icon}</span>
            <span className="text-white/70 text-xs leading-tight">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── No classes at all ─────────────────────────────────────────
function NoClassesState() {
  const { pick } = useLang();
  return (
    <div className="bii-card p-10 text-center">
      <VideoCamera size={52} weight="duotone" className="mx-auto mb-3 text-[var(--bii-text-soft)] opacity-30" />
      <p className="text-[var(--bii-text-soft)] font-medium">{pick("এখনো কোনো লাইভ ক্লাস নির্ধারণ করা হয়নি।", "No live classes have been scheduled yet.")}</p>
      <p className="text-xs text-[var(--bii-text-soft)] mt-1">{pick("শীঘ্রই আসছে — অনুগ্রহ করে অপেক্ষা করুন।", "Coming soon — please wait.")}</p>
    </div>
  );
}

// ── No enrolled courses (but might have free classes) ─────────
function NoCourseClassesState() {
  const { t, pick } = useLang();
  return (
    <div className="bii-card p-8 text-center border-dashed">
      <div className="w-14 h-14 rounded-2xl bg-[var(--bii-cream)] flex items-center justify-center mx-auto mb-3">
        <LockSimple size={30} weight="duotone" className="text-[var(--bii-text-soft)]" />
      </div>
      <h3 className="font-heading text-base text-[var(--bii-emerald)] mb-1">
        {pick("কোর্স-ভিত্তিক ক্লাস দেখতে কোর্সে ভর্তি হন", "Enroll in a course to access course classes")}
      </h3>
      <p className="text-xs text-[var(--bii-text-soft)] mb-4 max-w-xs mx-auto leading-relaxed">
        {pick("কোনো কোর্স কিনলে সেই কোর্সের exclusive live class এখানে দেখাবে।", "Purchase a course to see its exclusive live classes here.")}
      </p>
      <Link to="/courses" className="bii-btn-primary inline-flex items-center gap-2 text-sm">
        <BookOpen size={15} weight="fill" />
        {t("menuOurCourses")}
      </Link>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────
function SectionHeader({ icon, title, count, colorClass }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className={`font-heading text-lg ${colorClass}`}>{title}</h2>
      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${colorClass === "text-amber-700"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-[var(--bii-text-soft)] bg-[var(--bii-cream)] border-[var(--bii-border)]"
      }`}>
        {count}টি
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function LiveClasses() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get("/my-live-classes")
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Split into free vs course classes
  const freeClasses   = items.filter((l) => l.is_free);
  const courseClasses = items.filter((l) => !l.is_free);

  // Further split by timing
  const liveNowFree      = freeClasses.filter((l) => isLiveNow(l.scheduled_at));
  const upcomingFree     = freeClasses.filter((l) => isUpcoming(l.scheduled_at) && !isLiveNow(l.scheduled_at));
  const pastFree         = freeClasses.filter((l) => !isUpcoming(l.scheduled_at));

  const liveNowCourse    = courseClasses.filter((l) => isLiveNow(l.scheduled_at));
  const upcomingCourse   = courseClasses.filter((l) => isUpcoming(l.scheduled_at) && !isLiveNow(l.scheduled_at));
  const pastCourse       = courseClasses.filter((l) => !isUpcoming(l.scheduled_at));

  const totalLiveNow = liveNowFree.length + liveNowCourse.length;

  const { t, pick } = useLang();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--bii-emerald)] border-t-transparent animate-spin" />
        <p className="text-[var(--bii-text-soft)] text-sm">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div data-testid="live-classes-page" className="space-y-6 max-w-3xl mx-auto">

      {/* Hero */}
      <HeroBanner liveCount={totalLiveNow} hasFree={freeClasses.length > 0} />

      {/* Completely empty */}
      {items.length === 0 && <NoClassesState />}

      {/* ═══════════════════════════════════
          FREE LIVE CLASSES section
          (visible to ALL logged-in users)
      ═══════════════════════════════════ */}
      {freeClasses.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <GlobeSimple size={20} weight="duotone" className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{t("freeClass")}</p>
              <p className="text-xs text-amber-700">{pick("যেকোনো রেজিস্ট্রেশনকৃত সদস্য এই ক্লাসগুলোতে যোগ দিতে পারবেন", "Any registered member can join these classes")}</p>
            </div>
            <span className="ml-auto text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
              {freeClasses.length}টি
            </span>
          </div>

          {/* Live NOW (free) */}
          {liveNowFree.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-heading text-base text-red-600">{t("liveNow")}</span>
              </div>
              <div className="space-y-4">
                {liveNowFree.map((l) => <LiveClassCard key={l.id} lc={l} />)}
              </div>
            </div>
          )}

          {/* Upcoming free */}
          {upcomingFree.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarBlank size={16} weight="duotone" className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">{pick("আসন্ন ফ্রি ক্লাস", "Upcoming Free Classes")}</span>
              </div>
              <div className="space-y-4">
                {upcomingFree.map((l) => <LiveClassCard key={l.id} lc={l} />)}
              </div>
            </div>
          )}

          {/* Past free */}
          {pastFree.length > 0 && (
            <div className="opacity-70">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} weight="duotone" className="text-gray-400" />
                <span className="text-sm text-gray-500">{pick("সম্পন্ন ফ্রি ক্লাস", "Completed Free Classes")}</span>
              </div>
              <div className="space-y-4">
                {pastFree.map((l) => <LiveClassCard key={l.id} lc={l} />)}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════
          COURSE LIVE CLASSES section
          (only for enrolled students)
      ═══════════════════════════════════ */}
      {courseClasses.length === 0 && items.length > 0 && (
        // Has free classes but no course classes → show prompt to enroll
        <NoCourseClassesState />
      )}

      {courseClasses.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <LockSimple size={20} weight="duotone" className="text-[var(--bii-emerald)] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--bii-emerald)]">{t("myCourseClass")}</p>
              <p className="text-xs text-emerald-700">{pick("শুধুমাত্র আপনার কেনা কোর্সের লাইভ ক্লাস", "Live classes for your enrolled courses only")}</p>
            </div>
            <span className="ml-auto text-xs bg-[var(--bii-emerald)] text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
              {courseClasses.length}টি
            </span>
          </div>

          {/* Live NOW (course) */}
          {liveNowCourse.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-heading text-base text-red-600">{t("liveNow")}</span>
              </div>
              <div className="space-y-4">
                {liveNowCourse.map((l) => <LiveClassCard key={l.id} lc={l} />)}
              </div>
            </div>
          )}

          {/* Upcoming course */}
          {upcomingCourse.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarBlank size={16} weight="duotone" className="text-[var(--bii-emerald)]" />
                <span className="font-heading text-base text-[var(--bii-emerald)]">{t("upcoming")}</span>
              </div>
              <div className="space-y-4">
                {upcomingCourse.map((l) => <LiveClassCard key={l.id} lc={l} />)}
              </div>
            </div>
          )}

          {/* Past course */}
          {pastCourse.length > 0 && (
            <div className="opacity-70">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} weight="duotone" className="text-gray-400" />
                <span className="text-sm text-gray-500">{t("completedClass")}</span>
              </div>
              <div className="space-y-4">
                {pastCourse.map((l) => <LiveClassCard key={l.id} lc={l} />)}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
