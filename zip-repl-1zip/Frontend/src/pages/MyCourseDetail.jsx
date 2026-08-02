import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, VideoCamera, ArrowSquareOut, FilePdf,
  Clock, User, BookOpen, CalendarBlank,
  GraduationCap, LinkSimple, Info, Play,
} from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl } from "../lib/api";
import AdBanner from "../components/AdBanner";

// ── helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("bn-BD", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isUpcoming(iso) {
  if (!iso) return true;
  return new Date(iso) > new Date();
}

function youtubeEmbed(url) {
  if (!url) return null;
  const m =
    url.match(/youtu\.be\/([^?&]+)/) ||
    url.match(/youtube\.com\/watch\?v=([^&]+)/) ||
    url.match(/youtube\.com\/embed\/([^?&]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// ── sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[var(--bii-emerald)]">{icon}</span>
      <h2 className="font-heading text-xl text-[var(--bii-emerald)]">{title}</h2>
      {count != null && (
        <span className="ml-auto text-xs text-[var(--bii-text-soft)] bg-[var(--bii-cream)] border border-[var(--bii-border)] px-2 py-0.5 rounded-full">
          {count}টি
        </span>
      )}
    </div>
  );
}

function ZoomSteps() {
  const steps = [
    "আপনার ডিভাইসে Zoom অ্যাপ ইন্সটল করুন (zoom.us থেকে বিনামূল্যে পাওয়া যায়)।",
    'নিচের "ক্লাসে যোগ দিন" বাটনে ক্লিক করুন।',
    'Zoom অ্যাপ খুলবে — "Join" বাটনে ক্লিক করুন।',
    "হোস্ট ক্লাস শুরু করলে আপনি স্বয়ংক্রিয়ভাবে প্রবেশ করতে পারবেন।",
  ];
  return (
    <div className="mt-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
      <div className="flex items-center gap-2 mb-2 text-blue-700">
        <Info size={16} weight="fill" />
        <span className="text-xs font-semibold uppercase tracking-wider">কিভাবে যোগ দেবেন</span>
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-xs text-blue-800 leading-relaxed">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-[10px]">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function LiveClassCard({ lc }) {
  const upcoming = isUpcoming(lc.scheduled_at);
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className={`bii-card overflow-hidden ${upcoming ? "border-l-4 border-[var(--bii-emerald)]" : "opacity-80"}`}>
      {/* Header bar */}
      <div className={`px-5 py-3 flex items-center justify-between gap-2 ${upcoming ? "bg-emerald-50" : "bg-gray-50"}`}>
        <div className="flex items-center gap-2">
          <VideoCamera size={20} weight="fill" className={upcoming ? "text-[var(--bii-emerald)]" : "text-gray-400"} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${upcoming ? "text-[var(--bii-emerald)]" : "text-gray-400"}`}>
            {upcoming ? "আসন্ন লাইভ ক্লাস" : "সম্পন্ন ক্লাস"}
          </span>
        </div>
        {upcoming && (
          <span className="text-[10px] bg-[var(--bii-emerald)] text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
            LIVE
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-heading text-lg text-[var(--bii-emerald)] mb-1">{lc.title_bn || lc.title_en}</h3>
        {lc.title_en && lc.title_bn && (
          <p className="text-xs text-[var(--bii-text-soft)] mb-2 italic">{lc.title_en}</p>
        )}

        <div className="flex items-center gap-2 text-sm text-[var(--bii-text-soft)] mb-3">
          <CalendarBlank size={15} />
          <span>{formatDate(lc.scheduled_at)}</span>
        </div>

        {lc.description && (
          <p className="text-sm text-[var(--bii-text)] leading-relaxed mb-3">{lc.description}</p>
        )}

        {/* Zoom link card */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bii-cream)] border border-[var(--bii-border)] mb-3">
          <LinkSimple size={18} className="text-[var(--bii-gold)] flex-shrink-0" />
          <span className="text-xs text-[var(--bii-text-soft)] truncate flex-1 font-mono">{lc.join_url}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={lc.join_url}
            target="_blank"
            rel="noreferrer"
            className="bii-btn-primary flex items-center gap-2 flex-1 justify-center"
          >
            <VideoCamera size={17} weight="fill" />
            ক্লাসে যোগ দিন
            <ArrowSquareOut size={15} weight="bold" />
          </a>
          <button
            onClick={() => setShowSteps((v) => !v)}
            className="px-4 py-2 rounded-xl border border-[var(--bii-border)] text-sm text-[var(--bii-text-soft)] hover:bg-[var(--bii-cream)] transition"
          >
            {showSteps ? "লুকান" : "কিভাবে যোগ দেবেন?"}
          </button>
        </div>

        {showSteps && <ZoomSteps />}
      </div>
    </div>
  );
}

function VideoCard({ v }) {
  const embed = youtubeEmbed(v.video_url);
  const [play, setPlay] = useState(false);

  return (
    <div className="bii-card overflow-hidden">
      {/* Thumbnail / embed */}
      <div className="aspect-video bg-gray-900 relative">
        {play && embed ? (
          <iframe
            className="w-full h-full"
            src={`${embed}?autoplay=1`}
            title={v.title_bn || v.title_en}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <>
            {v.thumbnail ? (
              <img src={imgUrl(v.thumbnail)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <Play size={48} weight="fill" className="text-white/40" />
              </div>
            )}
            <button
              onClick={() => setPlay(true)}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={28} weight="fill" className="text-[var(--bii-emerald)] ml-1" />
              </div>
            </button>
          </>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading text-base text-[var(--bii-emerald)] leading-snug">
          {v.title_bn || v.title_en}
        </h3>
        {v.description && (
          <p className="text-xs text-[var(--bii-text-soft)] mt-1 line-clamp-2">{v.description}</p>
        )}
        {!embed && v.video_url && (
          <a
            href={v.video_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--bii-emerald)] underline underline-offset-2"
          >
            ভিডিও দেখুন <ArrowSquareOut size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

function PdfCard({ p }) {
  return (
    <a
      href={p.file_url}
      target="_blank"
      rel="noreferrer"
      className="bii-card p-4 flex items-center gap-3 hover:border-[var(--bii-gold)] transition group"
    >
      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition">
        <FilePdf size={24} weight="fill" className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[var(--bii-text)] truncate">{p.title}</div>
        {p.description && (
          <div className="text-xs text-[var(--bii-text-soft)] mt-0.5 truncate">{p.description}</div>
        )}
      </div>
      <ArrowSquareOut size={16} className="text-[var(--bii-text-soft)] flex-shrink-0 group-hover:text-[var(--bii-gold)] transition" />
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyCourseDetail() {
  const { id } = useParams();
  const { pick } = useLang();
  const [course, setCourse] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/courses/${id}/content`),
    ])
      .then(([cr, ct]) => {
        setCourse(cr.data);
        setContent(ct.data);
      })
      .catch((e) => {
        setError(e?.response?.data?.detail || "কোর্স লোড করতে সমস্যা হয়েছে");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--bii-emerald)] border-t-transparent animate-spin" />
        <p className="text-[var(--bii-text-soft)] text-sm">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bii-card p-8 text-center max-w-md mx-auto mt-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/my-courses" className="bii-btn-primary">ফিরে যান</Link>
      </div>
    );
  }

  const liveClasses = content?.live_classes || [];
  const videos = content?.videos || [];
  const pdfs = content?.pdfs || [];
  const upcomingLive = liveClasses.filter((l) => isUpcoming(l.scheduled_at));
  const pastLive = liveClasses.filter((l) => !isUpcoming(l.scheduled_at));

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* Back link */}
      <Link
        to="/my-courses"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] transition"
      >
        <ArrowLeft size={16} weight="bold" />
        আমার কোর্সসমূহ
      </Link>

      {/* Course hero */}
      <div className="bii-card overflow-hidden">
        {course.cover_image && (
          <div className="aspect-[21/9] overflow-hidden">
            <img src={imgUrl(course.cover_image)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl text-[var(--bii-emerald)] leading-tight">
                {pick(course.title_bn, course.title_en)}
              </h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-[var(--bii-text-soft)]">
                {course.instructor && (
                  <span className="flex items-center gap-1.5">
                    <User size={15} className="text-[var(--bii-gold)]" /> {course.instructor}
                  </span>
                )}
                {course.duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={15} className="text-[var(--bii-gold)]" /> {course.duration}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
              <GraduationCap size={15} weight="fill" />
              ভর্তি হয়েছেন
            </div>
          </div>

          {course.description_bn && (
            <>
              <div className="gold-divider my-4" />
              <h2 className="font-heading text-base mb-2 flex items-center gap-2">
                <BookOpen size={18} className="text-[var(--bii-gold)]" /> কোর্স বিবরণ
              </h2>
              <p className="text-[var(--bii-text-soft)] text-sm leading-relaxed whitespace-pre-line">
                {pick(course.description_bn, course.description_en)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Live Classes ───────────────────────────────────────── */}
      {liveClasses.length > 0 && (
        <section>
          <SectionHeader
            icon={<VideoCamera size={22} weight="duotone" />}
            title="লাইভ ক্লাস (Zoom)"
            count={liveClasses.length}
          />
          <div className="space-y-4">
            {upcomingLive.map((lc) => <LiveClassCard key={lc.id} lc={lc} />)}
            {pastLive.length > 0 && (
              <>
                {upcomingLive.length > 0 && (
                  <p className="text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mt-2">সম্পন্ন ক্লাস</p>
                )}
                {pastLive.map((lc) => <LiveClassCard key={lc.id} lc={lc} />)}
              </>
            )}
          </div>
        </section>
      )}

      {liveClasses.length === 0 && (
        <div className="bii-card p-6 text-center">
          <VideoCamera size={36} weight="duotone" className="text-[var(--bii-text-soft)] mx-auto mb-2" />
          <p className="text-sm text-[var(--bii-text-soft)]">এই কোর্সের লাইভ ক্লাস শীঘ্রই যোগ করা হবে।</p>
        </div>
      )}

      <AdBanner slot="lesson-between" format="responsive" className="my-2" />

      {/* ── Videos ────────────────────────────────────────────── */}
      {videos.length > 0 && (
        <section>
          <SectionHeader
            icon={<Play size={22} weight="duotone" />}
            title="ভিডিও লেকচার"
            count={videos.length}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {videos.map((v) => <VideoCard key={v.id} v={v} />)}
          </div>
        </section>
      )}

      {/* ── PDFs ──────────────────────────────────────────────── */}
      {pdfs.length > 0 && (
        <section>
          <SectionHeader
            icon={<FilePdf size={22} weight="duotone" />}
            title="পিডিএফ ও স্টাডি মেটেরিয়াল"
            count={pdfs.length}
          />
          <div className="space-y-3">
            {pdfs.map((p) => <PdfCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
