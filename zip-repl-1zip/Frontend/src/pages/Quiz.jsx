import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Trophy, CheckCircle, XCircle, Clock, CalendarBlank,
  ListChecks, ArrowRight, ArrowLeft, SealCheck, Warning,
  Timer, Medal, Gift, Info, UserCircle, ChartBar,
  Question, CaretDown, CaretUp, Star, Confetti,
  MedalMilitary, House,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl } from "../lib/api";
import { toast } from "sonner";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";
import { quizStart, quizEnd, quizStatus as quizStatusShared } from "../lib/quizWindow"; // 2026-08-24: multi-day quiz windows

// ── Quiz Ad countdown timer ──────────────────────────────────────
function QuizAdTimer({ onTick, onDone, seconds = 5 }) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    onTick(left);
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);
  return null;
}

// ── helpers ─────────────────────────────────────────────────────
const BANGLA_OPTS = ["ক", "খ", "গ", "ঘ", "ঙ"];
const BANGLA_NUM = (n) => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("bn-BD", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return iso; }
}

// 2026-08-24: format full datetime "yyyy-mm-dd hh:mm:ss" for multi-day quizzes
function fmtDateTime(dt) {
  if (!dt) return "—";
  const d = new Date(String(dt).replace(" ", "T"));
  if (isNaN(d)) return dt;
  return `${fmtDate(String(dt).slice(0, 10))} ${String(dt).slice(11, 16)}`;
}

function fmtTime(seconds) {
  if (seconds <= 0) return "০০:০০";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${BANGLA_NUM(String(m).padStart(2, "0"))}:${BANGLA_NUM(String(s).padStart(2, "0"))}`;
}

function fmtDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${BANGLA_NUM(s)} সেকেন্ড`;
  if (s === 0) return `${BANGLA_NUM(m)} মিনিট`;
  return `${BANGLA_NUM(m)} মিনিট ${BANGLA_NUM(s)} সেকেন্ড`;
}

function quizStatus(q) {
  // 2026-08-24: moved to lib/quizWindow (supports start_at/end_at full datetimes)
  return quizStatusShared(q);
}

// ── Countdown ───────────────────────────────────────────────────
function Countdown({ targetDate, label, onExpire }) {
  const { t } = useLang();
  const [secs, setSecs] = useState(Math.max(0, Math.floor((new Date(targetDate) - Date.now()) / 1000)));
  useEffect(() => {
    if (secs <= 0) { onExpire?.(); return; }
    const timer = setTimeout(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  });
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const blocks = d > 0
    ? [{ v: d, l: t("quizDays") }, { v: h, l: t("quizHours") }, { v: m, l: t("quizMinutes") }]
    : [{ v: h, l: t("quizHours") }, { v: m, l: t("quizMinutes") }, { v: s, l: t("quizSeconds") }];
  return (
    <div className="text-center">
      {label && <p className="text-xs text-white/70 mb-2 uppercase tracking-widest">{label}</p>}
      <div className="flex items-center justify-center gap-2">
        {blocks.map(({ v, l }) => (
          <div key={l} className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 min-w-[56px]">
            <div className="font-heading text-2xl text-white">{BANGLA_NUM(String(v).padStart(2, "0"))}</div>
            <div className="text-[10px] text-white/70">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Timer Bar (during quiz) ─────────────────────────────────────
function TimerBar({ deadline, onExpire }) {
  const totalRef = useRef(Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000)));
  const [left, setLeft] = useState(totalRef.current);
  useEffect(() => {
    if (left <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearTimeout(t);
  });
  const pct = totalRef.current > 0 ? (left / totalRef.current) * 100 : 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-400" : "bg-red-500";
  const urgent = pct <= 20;
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 font-mono font-bold text-lg min-w-[72px] ${urgent ? "text-red-600 animate-pulse" : "text-[var(--bii-emerald)]"}`}>
        <Timer size={20} weight={urgent ? "fill" : "duotone"} />
        {fmtTime(left)}
      </div>
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Leaderboard rows ────────────────────────────────────────────
function LeaderboardTable({ entries, myId, compact = false }) {
  const { t, pick } = useLang();
  if (!entries?.length) return (
    <p className="text-center text-[var(--bii-text-soft)] py-6 text-sm">{pick("এখনো কোনো অংশগ্রহণকারী নেই।", "No participants yet.")}</p>
  );
  const top = compact ? entries.slice(0, 10) : entries;
  const rankIcon = (r) => {
    if (r === 1) return <MedalMilitary size={18} weight="fill" className="text-amber-500" />;
    if (r === 2) return <Medal size={18} weight="fill" className="text-gray-400" />;
    if (r === 3) return <Medal size={18} weight="fill" className="text-amber-700" />;
    return <span className="text-xs text-[var(--bii-text-soft)] font-bold w-5 text-center">{r}</span>;
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--bii-border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bii-cream)]">
          <tr>
            <th className="text-left text-xs text-[var(--bii-text-soft)] uppercase tracking-wider px-4 py-2.5">#</th>
            <th className="text-left text-xs text-[var(--bii-text-soft)] uppercase tracking-wider px-2 py-2.5">{pick("নাম", "Name")}</th>
            <th className="text-right text-xs text-[var(--bii-text-soft)] uppercase tracking-wider px-4 py-2.5">{pick("নম্বর", "Score")}</th>
            <th className="text-right text-xs text-[var(--bii-text-soft)] uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell">{pick("সময়", "Time")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--bii-border)]">
          {top.map((e) => {
            const isMe = e.user_id === myId;
            return (
              <tr key={e.id} className={`transition ${isMe ? "bg-emerald-50 font-semibold" : "hover:bg-[var(--bii-cream)]"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-7">{rankIcon(e.rank)}</div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <UserCircle size={20} weight="duotone" className={isMe ? "text-[var(--bii-emerald)]" : "text-[var(--bii-text-soft)]"} />
                    <span className={isMe ? "text-[var(--bii-emerald)]" : ""}>{e.user_name || "—"}</span>
                    {isMe && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded-full">{pick("আপনি", "You")}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[var(--bii-emerald)]">
                  {e.score}/{e.total_marks}
                </td>
                <td className="px-4 py-3 text-right text-xs text-[var(--bii-text-soft)] hidden sm:table-cell">
                  {fmtDuration(e.time_taken_seconds)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: "কুইজে কতটি প্রশ্ন থাকে?", a: "প্রতি মাসের কুইজে ৩০টি MCQ প্রশ্ন থাকে।" },
  { q: "সময় শেষ হলে কি হবে?", a: "সময় শেষ হলে স্বয়ংক্রিয়ভাবে সাবমিট হয়ে যাবে।" },
  { q: "একবারের বেশি দেওয়া যাবে?", a: "না, প্রতিটি কুইজ একজন শিক্ষার্থী মাত্র একবারই দিতে পারবে।" },
  { q: "প্রশ্ন কি random হয়?", a: "হ্যাঁ, প্রশ্নের ক্রম এবং অপশনের ক্রম random হয়।" },
  { q: "বিজয়ী কীভাবে নির্বাচিত হয়?", a: "সর্বোচ্চ নম্বরপ্রাপ্ত, এবং সমান নম্বরে কম সময়ে সম্পন্নকারী বিজয়ী।" },
  { q: "পুরস্কার কীভাবে পাব?", a: "বিজয়ীদের সাথে ইমেইলে যোগাযোগ করা হবে এবং ঠিকানা অনুযায়ী পুরস্কার পাঠানো হবে।" },
];

function FAQSection() {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-[var(--bii-border)] rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bii-cream)] transition"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div className="flex items-center gap-2">
              <Question size={16} weight="fill" className="text-[var(--bii-gold)] flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--bii-text)]">{item.q}</span>
            </div>
            {open === i ? <CaretUp size={16} className="text-[var(--bii-text-soft)]" /> : <CaretDown size={16} className="text-[var(--bii-text-soft)]" />}
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-sm text-[var(--bii-text-soft)] leading-relaxed border-t border-[var(--bii-border)] pt-3 bg-[var(--bii-cream)]">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VIEW 1 — Landing Page
// ══════════════════════════════════════════════════════════════
function QuizLanding({ quiz, myResult, leaderboard, user, onStart, allQuizzes, allMyResults }) {
  const { t, pick } = useLang();
  const st = quizStatus(quiz);
  const hasSubmitted = !!myResult;
  const startDT = quizStart(quiz); // 2026-08-24: supports start_at/end_at
  const endDT   = quizEnd(quiz);
  const [refreshKey, setRefreshKey] = useState(0);
  const winners = quiz.winners || [];
  const pastQuizzes = allQuizzes.filter((q) => quizStatus(q) === "closed" && q.id !== quiz.id);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16 sm:pb-24">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--bii-emerald)] via-emerald-700 to-emerald-900 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, gold 0%, transparent 50%)" }} />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Trophy size={32} weight="duotone" className="text-[var(--bii-gold)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/60 uppercase tracking-widest mb-1">{t("monthlyQuiz")}</div>
              <h1 className="font-heading text-2xl sm:text-3xl text-white leading-tight">{quiz.title_bn}</h1>
              {quiz.title_en && <p className="text-white/60 text-sm mt-0.5">{quiz.title_en}</p>}
            </div>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { icon: <CalendarBlank size={13} />, label: fmtDate(quiz.exam_date) },
              { icon: <Clock size={13} />, label: quiz.end_at ? `${fmtDateTime(quiz.start_at)} — ${fmtDateTime(quiz.end_at)}` : `${quiz.start_time || "00:00"} — ${quiz.end_time || "23:59"}` },
              { icon: <Timer size={13} />, label: `${quiz.duration_minutes || 30} ${pick("মিনিট", "min")}` },
              { icon: <ListChecks size={13} />, label: `${(quiz.questions || []).length} ${pick("প্রশ্ন", "questions")}` },
            ].map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-white/15 text-white/90 text-xs px-2.5 py-1 rounded-full">
                {c.icon} {c.label}
              </span>
            ))}
          </div>

          {/* Countdown */}
          {st === "upcoming" && (
            <Countdown
              targetDate={startDT}
              label={pick("কুইজ শুরু হতে বাকি", "Quiz starts in")}
              onExpire={() => setRefreshKey((k) => k + 1)}
            />
          )}
          {st === "active" && !hasSubmitted && (
            <Countdown
              targetDate={endDT}
              label={pick("কুইজ শেষ হতে বাকি", "Quiz ends in")}
              onExpire={() => setRefreshKey((k) => k + 1)}
            />
          )}
          {(st === "closed" || hasSubmitted) && (
            <div className="text-center text-white/70 text-sm">
              {st === "closed" ? pick("এই কুইজ সমাপ্ত হয়েছে", "This quiz has ended") : pick("আপনি ইতিমধ্যে অংশ নিয়েছেন", "You have already participated")}
            </div>
          )}
        </div>
      </div>

      {/* ── My Result Snapshot (if submitted) ── */}
      {hasSubmitted && myResult && (
        <div className={`bii-card p-5 border-2 ${myResult.passed ? "border-emerald-300 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center gap-3 mb-3">
            <SealCheck size={28} weight="fill" className={myResult.passed ? "text-emerald-600" : "text-amber-500"} />
            <div>
              <div className="font-heading text-lg text-[var(--bii-emerald)]">{t("quizYourResult")}</div>
              <div className="text-xs text-[var(--bii-text-soft)]">{myResult.passed ? pick("পাশ করেছেন 🎉", "Passed 🎉") : pick("পাশ হয়নি", "Not passed")}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: pick("নম্বর", "Score"), val: `${myResult.score}/${myResult.total_marks}` },
              { label: pick("শতকরা", "Pct"), val: `${Math.round((myResult.score / myResult.total_marks) * 100)}%` },
              { label: pick("র‍্যাঙ্ক", "Rank"), val: `#${myResult.rank || "?"}` },
              { label: pick("সময়", "Time"), val: fmtDuration(myResult.time_taken_seconds) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-2">
                <div className="font-heading text-base text-[var(--bii-emerald)]">{s.val}</div>
                <div className="text-[10px] text-[var(--bii-text-soft)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSubmitted && <AdBanner slot="quiz-result" format="responsive" className="my-2" />}

      {/* ── CTA Button ── */}
      {st === "active" && !hasSubmitted && (
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--bii-emerald)] to-emerald-600 text-white font-heading text-xl font-bold flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition shadow-lg shadow-emerald-200"
        >
          <Trophy size={24} weight="fill" className="text-[var(--bii-gold)]" />
          {t("startQuiz")}
          <ArrowRight size={22} weight="bold" />
        </button>
      )}

      {/* ── Prize Section ── */}
      {(quiz.prize_title || quiz.prize_image || quiz.prize_description) && (
        <div className="bii-card overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 px-5 py-3 flex items-center gap-2">
            <Gift size={20} weight="duotone" className="text-amber-600" />
            <h2 className="font-heading text-base text-amber-800">{pick("এই মাসের পুরস্কার", "This Month's Prize")}</h2>
          </div>
          <div className="p-5 flex gap-4 items-start">
            {quiz.prize_image && (
              <img
                src={imgUrl(quiz.prize_image)}
                alt="পুরস্কার"
                className="w-24 h-24 object-cover rounded-xl border border-amber-200 flex-shrink-0"
              />
            )}
            <div>
              {quiz.prize_title && (
                <h3 className="font-heading text-lg text-[var(--bii-emerald)] mb-1">{quiz.prize_title}</h3>
              )}
              {quiz.prize_description && (
                <p className="text-sm text-[var(--bii-text)] leading-relaxed">{quiz.prize_description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Rules ── */}
      {quiz.rules?.length > 0 && (
        <div className="bii-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info size={18} weight="duotone" className="text-[var(--bii-emerald)]" />
            <h2 className="font-heading text-base text-[var(--bii-emerald)]">{pick("কুইজের নিয়মাবলী", "Quiz Rules")}</h2>
          </div>
          <ol className="space-y-2">
            {quiz.rules.map((rule, i) => (
              <li key={i} className="flex gap-3 text-sm text-[var(--bii-text)] leading-relaxed">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--bii-emerald)] text-white flex items-center justify-center text-xs font-bold">
                  {BANGLA_NUM(i + 1)}
                </span>
                {rule}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Leaderboard ── */}
      {leaderboard?.length > 0 && (
        <div className="bii-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ChartBar size={20} weight="duotone" className="text-[var(--bii-emerald)]" />
            <h2 className="font-heading text-base text-[var(--bii-emerald)]">{t("leaderboard")}</h2>
            <span className="ml-auto text-xs text-[var(--bii-text-soft)]">{leaderboard.length} {pick("জন অংশগ্রহণকারী", "participants")}</span>
          </div>
          <LeaderboardTable entries={leaderboard} myId={user?.id} compact />
        </div>
      )}

      {/* ── Winners ── */}
      {winners.length > 0 && (
        <div className="bii-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star size={20} weight="fill" className="text-amber-500" />
            <h2 className="font-heading text-base text-[var(--bii-emerald)]">{pick("বিজয়ী তালিকা", "Winners List")}</h2>
          </div>
          <div className="space-y-2">
            {winners.map((w, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm">
                  {w.rank || i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--bii-text)]">{w.name || w.user_name || "—"}</div>
                  {w.score !== undefined && (
                    <div className="text-xs text-[var(--bii-text-soft)]">{pick("নম্বর", "Score")}: {w.score}/{w.total_marks}</div>
                  )}
                </div>
                {w.prize_label && (
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{w.prize_label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Past Quizzes ── */}
      {pastQuizzes.length > 0 && (
        <div className="bii-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarBlank size={18} weight="duotone" className="text-[var(--bii-text-soft)]" />
            <h2 className="font-heading text-base text-[var(--bii-text-soft)]">{pick("আগের কুইজ", "Previous Quizzes")}</h2>
          </div>
          <div className="space-y-2">
            {pastQuizzes.slice(0, 3).map((pq) => {
              const mr = allMyResults.find((r) => r.quiz_id === pq.id);
              return (
                <div key={pq.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bii-cream)] border border-[var(--bii-border)]">
                  <Trophy size={18} weight="duotone" className="text-[var(--bii-text-soft)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--bii-text)] truncate">{pq.title_bn}</div>
                    <div className="text-xs text-[var(--bii-text-soft)]">{fmtDate(pq.exam_date)}</div>
                  </div>
                  {mr && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mr.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {mr.score}/{mr.total_marks}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      <div className="bii-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Question size={18} weight="fill" className="text-[var(--bii-gold)]" />
          <h2 className="font-heading text-base text-[var(--bii-emerald)]">{pick("সাধারণ প্রশ্নোত্তর (FAQ)", "FAQ")}</h2>
        </div>
        <FAQSection />
      </div>
      <BottomBanner slot="quiz-bottom" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VIEW 2 — Quiz Taking
// ══════════════════════════════════════════════════════════════
function QuizTaking({ quiz, session, onDone, onCancel }) {
  const { t, pick } = useLang();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});   // {orig_index: chosen_option}
  const [shuffleMap, setShuffleMap] = useState([]); // shuffleMap[display_i] = orig_i
  const [optMaps, setOptMaps] = useState([]);    // optMaps[orig_i] = shuffled option order
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showQuizAd, setShowQuizAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const adCountRef = useRef(0);   // how many answers since last ad
  const timedOut = useRef(false);

  useEffect(() => {
    // Shuffle questions + options deterministically for display
    const qs = quiz.questions || [];
    // Simple shuffle using index (replace with seeded random if needed)
    const qIdxs = [...qs.keys()];
    for (let i = qIdxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qIdxs[i], qIdxs[j]] = [qIdxs[j], qIdxs[i]];
    }
    // Shuffle options for each question
    const oMaps = qs.map((q) => {
      const idxs = [...(q.options || []).keys()];
      for (let i = idxs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
      }
      return idxs;
    });
    setShuffleMap(qIdxs);
    setOptMaps(oMaps);
    setQuestions(qs);
  }, [quiz]);

  const doSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Re-map answers back to original question/option order
      const origAnswers = questions.map((_, origIdx) => {
        const chosen = answers[origIdx];
        if (chosen === undefined || chosen === null) return null;
        // chosen is index into shuffled options for origIdx
        // optMaps[origIdx][chosen] = original option index
        return optMaps[origIdx]?.[chosen] ?? chosen;
      });
      const res = await api.post(`/monthly-quizzes/${quiz.id}/submit`, { answers: origAnswers });
      onDone(res.data);
    } catch (e) {
      const msg = e?.response?.data?.detail || "সাবমিট করতে সমস্যা";
      toast.error(msg);
      setSubmitting(false);
    }
  }, [submitting, questions, answers, optMaps, quiz.id, onDone]);

  const handleTimeOut = useCallback(() => {
    if (!timedOut.current) {
      timedOut.current = true;
      toast.info("সময় শেষ! স্বয়ংক্রিয়ভাবে সাবমিট হচ্ছে...");
      doSubmit(true);
    }
  }, [doSubmit]);

  if (!questions.length || !shuffleMap.length) return (
    <div className="flex flex-col items-center py-10 gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-[var(--bii-emerald)] border-t-transparent animate-spin" />
      <p className="text-sm text-[var(--bii-text-soft)]">{pick("প্রশ্নপত্র লোড হচ্ছে...", "Loading questions...")}</p>
    </div>
  );

  const origIdx = shuffleMap[current];
  const q = questions[origIdx];
  const shuffledOpts = (optMaps[origIdx] || []).map((oi) => q.options[oi]);
  const answered = Object.keys(answers).length;
  const total = questions.length;
  const deadline = session?.deadline;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">
      {/* ── Fixed Header ── */}
      <div className="bii-card p-4 sticky top-0 z-30 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-heading text-sm text-[var(--bii-emerald)] truncate">{quiz.title_bn}</h2>
          <button onClick={onCancel} className="text-xs text-[var(--bii-text-soft)] hover:text-red-600 transition flex-shrink-0 flex items-center gap-1">
            <XCircle size={15} /> বাতিল
          </button>
        </div>
        {/* Timer */}
        {deadline && <TimerBar deadline={deadline} onExpire={handleTimeOut} />}
        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[var(--bii-text-soft)] mb-1.5">
            <span>{pick("প্রশ্ন", "Q")} {BANGLA_NUM(current + 1)}/{BANGLA_NUM(total)}</span>
            <span>{BANGLA_NUM(answered)}/{BANGLA_NUM(total)} {pick("উত্তর", "answered")}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--bii-emerald)] rounded-full transition-all"
              style={{ width: `${((current + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Question Grid Nav ── */}
      <div className="bii-card p-3">
        <div className="flex flex-wrap gap-1.5">
          {shuffleMap.map((oi, di) => (
            <button
              key={di}
              type="button"
              onClick={() => setCurrent(di)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                di === current
                  ? "bg-[var(--bii-emerald)] text-white shadow"
                  : answers[shuffleMap[di]] !== undefined
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-[var(--bii-cream)] border border-[var(--bii-border)] text-[var(--bii-text-soft)]"
              }`}
            >
              {BANGLA_NUM(di + 1)}
            </button>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-[var(--bii-text-soft)]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200 inline-block" /> {pick("উত্তর দেওয়া", "Answered")}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[var(--bii-cream)] border border-[var(--bii-border)] inline-block" /> {pick("উত্তর দেওয়া হয়নি", "Not answered")}</span>
        </div>
      </div>

      {/* ── Question Card ── */}
      <div className="bii-card p-6">
        <div className="flex items-start gap-3 mb-6">
          <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--bii-emerald)] text-white font-bold flex items-center justify-center text-sm">
            {BANGLA_NUM(current + 1)}
          </span>
          <p className="font-medium text-[var(--bii-text)] text-base leading-relaxed pt-1.5">
            {q.q}
            <span className="ml-2 text-xs text-[var(--bii-gold)]">({q.marks} {pick("নম্বর", "pts")})</span>
          </p>
        </div>

        <div className="space-y-3">
          {shuffledOpts.map((opt, si) => {
            const selected = answers[origIdx] === si;
            return (
              <button
                key={si}
                type="button"
                onClick={() => {
                  const wasAnswered = answers[origIdx] !== undefined;
                  setAnswers((a) => ({ ...a, [origIdx]: si }));
                  if (!wasAnswered) {
                    adCountRef.current += 1;
                    const interval = Number(quiz.ad_interval ?? 10);
                    const perAnswer = !!quiz.ad_per_answer;
                    if (perAnswer || (interval > 0 && adCountRef.current >= interval)) {
                      if (!perAnswer) adCountRef.current = 0;
                      setAdCountdown(5);
                      setShowQuizAd(true);
                    }
                  }
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                  selected
                    ? "border-[var(--bii-emerald)] bg-emerald-50 shadow-sm"
                    : "border-[var(--bii-border)] hover:border-emerald-300 hover:bg-[var(--bii-cream)]"
                }`}
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-full border-2 font-bold text-sm flex items-center justify-center transition-all ${
                  selected
                    ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white"
                    : "border-[var(--bii-border)] text-[var(--bii-text-soft)]"
                }`}>
                  {BANGLA_OPTS[si]}
                </span>
                <span className="text-[var(--bii-text)] leading-snug">{opt}</span>
                {selected && <CheckCircle size={20} weight="fill" className="text-[var(--bii-emerald)] ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quiz Interstitial Ad Overlay ── */}
      {showQuizAd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[var(--bii-emerald)] px-5 py-3 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">📢 বিজ্ঞাপন</span>
              <span className="text-white/70 text-xs">{adCountdown > 0 ? `${adCountdown}s` : "—"}</span>
            </div>
            <div className="p-4 min-h-[140px] flex items-center justify-center bg-[var(--bii-cream)]">
              <AdBanner slot="quiz-interstitial" format="responsive" className="w-full" />
            </div>
            <div className="px-4 pb-4">
              <QuizAdTimer
                key={showQuizAd}
                onTick={setAdCountdown}
                onDone={() => {}}
              />
              <button
                disabled={adCountdown > 0}
                onClick={() => setShowQuizAd(false)}
                className="w-full mt-3 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--bii-emerald)] text-white"
              >
                {adCountdown > 0 ? `${adCountdown} ${pick("সেকেন্ড অপেক্ষা করুন", "sec")}` : pick("কুইজ চালিয়ে যান →", "Continue Quiz →")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-1 px-5 py-3 rounded-xl bg-[var(--bii-cream)] border border-[var(--bii-border)] text-[var(--bii-text-soft)] disabled:opacity-40 hover:bg-white transition font-semibold text-sm"
        >
          <ArrowLeft size={16} weight="bold" /> {pick("আগের", "Prev")}
        </button>
        {current < total - 1 ? (
          <button
            type="button"
            onClick={() => setCurrent((c) => c + 1)}
            className="bii-btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {pick("পরের প্রশ্ন", "Next")} <ArrowRight size={16} weight="bold" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmSubmit(true)}
            disabled={submitting}
            className="bii-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Trophy size={18} weight="fill" />
            {submitting ? pick("সাবমিট হচ্ছে...", "Submitting...") : pick("সাবমিট করুন", "Submit")}
          </button>
        )}
      </div>

      {/* Unanswered warning + submit */}
      {answered < total && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <Warning size={16} weight="fill" className="text-amber-500 flex-shrink-0" />
          {BANGLA_NUM(total - answered)} {pick("টি প্রশ্নের উত্তর দেওয়া হয়নি।", "questions unanswered.")}
          <button
            onClick={() => setConfirmSubmit(true)}
            disabled={submitting}
            className="ml-auto text-xs bg-amber-500 text-white px-3 py-1 rounded-lg disabled:opacity-50"
          >
            {pick("এখনই সাবমিট", "Submit Now")}
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trophy size={48} weight="duotone" className="mx-auto mb-3 text-[var(--bii-gold)]" />
            <h3 className="font-heading text-xl text-[var(--bii-emerald)] mb-2">{pick("সাবমিট করবেন?", "Submit?")}</h3>
            <p className="text-sm text-[var(--bii-text-soft)] mb-1">
              {BANGLA_NUM(answered)}/{BANGLA_NUM(total)} {pick("প্রশ্নের উত্তর দিয়েছেন।", "questions answered.")}
            </p>
            {answered < total && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                {BANGLA_NUM(total - answered)} {pick("টি প্রশ্ন এখনো উত্তরবিহীন।", "questions still unanswered.")}
              </p>
            )}
            <p className="text-xs text-[var(--bii-text-soft)] mb-5">{pick("সাবমিট করলে আর পরিবর্তন করা যাবে না।", "You cannot change answers after submitting.")}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:bg-[var(--bii-cream)] text-sm">
                {pick("ফিরে যান", "Cancel")}
              </button>
              <button
                onClick={() => { setConfirmSubmit(false); doSubmit(); }}
                disabled={submitting}
                className="flex-1 bii-btn-primary"
              >
                {submitting ? pick("হচ্ছে...", "...") : pick("সাবমিট", "Submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VIEW 3 — Result
// ══════════════════════════════════════════════════════════════
function QuizResult({ result, quiz, leaderboard, user, onBack }) {
  const { t, pick } = useLang();
  const [showReview, setShowReview] = useState(false);
  const pct = Math.round((result.score / result.total_marks) * 100);
  const correct = (result.detail || []).filter((d) => d.is_correct).length;
  const wrong   = (result.detail || []).length - correct;
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-6">

      {/* Score hero */}
      <div className={`bii-card overflow-hidden`}>
        <div className={`px-6 py-10 text-center ${result.passed ? "bg-gradient-to-br from-[var(--bii-emerald)] to-emerald-600" : "bg-gradient-to-br from-gray-600 to-gray-800"}`}>
          {result.passed
            ? <Confetti size={64} weight="fill" className="text-[var(--bii-gold)] mx-auto mb-3" />
            : <Trophy size={64} weight="duotone" className="text-white/50 mx-auto mb-3" />
          }
          <h2 className="font-heading text-3xl text-white mb-1">
            {result.passed ? pick("অভিনন্দন! 🎉", "Congratulations! 🎉") : pick("চেষ্টা করেছেন!", "You tried!")}
          </h2>
          <p className="text-white/70 text-sm mb-5">
            {result.passed ? pick("দারুণ পারফরম্যান্স!", "Great performance!") : pick("পরের মাসে আরও ভালো করুন", "Do better next month")}
          </p>
          {/* Score ring */}
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/10 border-4 border-white/30 mx-auto">
            <div>
              <div className="font-heading text-4xl text-white">{pct}%</div>
              <div className="text-xs text-white/70">{result.score}/{result.total_marks}</div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: pick("সঠিক", "Correct"), val: BANGLA_NUM(correct), cls: "text-green-600", bg: "bg-green-50" },
              { label: pick("ভুল", "Wrong"), val: BANGLA_NUM(wrong), cls: "text-red-500", bg: "bg-red-50" },
              { label: pick("র‍্যাঙ্ক", "Rank"), val: result.rank ? `#${BANGLA_NUM(result.rank)}` : "—", cls: "text-[var(--bii-gold)]", bg: "bg-amber-50" },
              { label: pick("সময়", "Time"), val: fmtDuration(result.time_taken_seconds), cls: "text-blue-600", bg: "bg-blue-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
                <div className={`font-heading text-xl font-bold ${s.cls}`}>{s.val}</div>
                <div className="text-xs text-[var(--bii-text-soft)]">{s.label}</div>
              </div>
            ))}
          </div>
          {result.total_participants > 0 && (
            <p className="text-center text-xs text-[var(--bii-text-soft)] mt-3">
              {pick("মোট", "Total")} {BANGLA_NUM(result.total_participants)} {pick("জনের মধ্যে আপনার অবস্থান:", "participants — your rank:")} #{BANGLA_NUM(result.rank || "?")}
            </p>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard?.length > 0 && (
        <div className="bii-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ChartBar size={20} weight="duotone" className="text-[var(--bii-emerald)]" />
            <h3 className="font-heading text-base text-[var(--bii-emerald)]">{t("leaderboard")}</h3>
          </div>
          <LeaderboardTable entries={leaderboard} myId={user?.id} compact />
        </div>
      )}

      {/* Answer Review */}
      <div className="bii-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--bii-cream)] transition"
          onClick={() => setShowReview((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <ListChecks size={18} weight="duotone" className="text-[var(--bii-emerald)]" />
            <span className="font-heading text-base text-[var(--bii-emerald)]">{pick("উত্তর রিভিউ", "Answer Review")}</span>
          </div>
          {showReview ? <CaretUp size={18} className="text-[var(--bii-text-soft)]" /> : <CaretDown size={18} className="text-[var(--bii-text-soft)]" />}
        </button>
        {showReview && (
          <div className="border-t border-[var(--bii-border)] p-4 space-y-3">
            {(result.detail || []).map((d, i) => (
              <div key={i} className={`rounded-xl p-4 border ${d.is_correct ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-start gap-2 mb-2">
                  {d.is_correct
                    ? <CheckCircle size={18} weight="fill" className="text-green-600 flex-shrink-0 mt-0.5" />
                    : <XCircle size={18} weight="fill" className="text-red-500 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1">
                    <span className="text-xs font-bold text-[var(--bii-text-soft)] mr-2">{pick("প্রশ্ন", "Q.")} {BANGLA_NUM(i + 1)}</span>
                    <p className="text-sm text-[var(--bii-text)] leading-snug mt-0.5">{d.q}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${d.is_correct ? "text-green-700" : "text-red-500"}`}>
                    {d.is_correct ? `+${d.marks}` : "০"}
                  </span>
                </div>
                {(d.options || []).length > 0 && (
                  <div className="space-y-1 pl-6">
                    {d.options.map((opt, oi) => {
                      const isGiven   = d.given === oi;
                      const isCorrect = d.correct === oi;
                      return (
                        <div key={oi} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${
                          isCorrect ? "bg-green-100 text-green-800 font-semibold"
                          : isGiven && !isCorrect ? "bg-red-100 text-red-700"
                          : "text-[var(--bii-text-soft)]"
                        }`}>
                          <span className="font-bold">{BANGLA_OPTS[oi]}</span>
                          <span>{opt}</span>
                          {isCorrect && <CheckCircle size={13} weight="fill" className="text-green-600 ml-auto" />}
                          {isGiven && !isCorrect && <XCircle size={13} weight="fill" className="text-red-500 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bii-cream)] border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:bg-white transition text-sm font-semibold"
      >
        <House size={18} /> {pick("কুইজ হোমে ফিরুন", "Back to Quiz")}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
export default function Quiz() {
  const { user } = useAuth();
  const { t, pick } = useLang();
  const [quizzes, setQuizzes]     = useState([]);
  const [myResults, setMyResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("landing"); // landing | taking | result
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [session, setSession]     = useState(null);
  const [doneResult, setDoneResult] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [qr, mr] = await Promise.all([
        api.get("/monthly-quizzes"),
        user ? api.get("/my-quiz-results") : Promise.resolve({ data: [] }),
      ]);
      setQuizzes(qr.data || []);
      setMyResults(mr.data || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // Load leaderboard whenever active quiz changes
  useEffect(() => {
    if (!activeQuiz) return;
    api.get(`/monthly-quizzes/${activeQuiz.id}/leaderboard`)
      .then((r) => setLeaderboard(r.data || []))
      .catch(() => setLeaderboard([]));
  }, [activeQuiz]);

  const handleStart = async (quiz) => {
    try {
      const res = await api.post(`/monthly-quizzes/${quiz.id}/start`);
      setSession(res.data);
      setActiveQuiz(quiz);
      setView("taking");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "কুইজ শুরু করতে সমস্যা হয়েছে");
    }
  };

  const handleDone = (result) => {
    setDoneResult(result);
    // Reload leaderboard with fresh data
    api.get(`/monthly-quizzes/${activeQuiz.id}/leaderboard`)
      .then((r) => setLeaderboard(r.data || []));
    setView("result");
  };

  const handleBack = () => {
    setView("landing");
    setActiveQuiz(null);
    setSession(null);
    setDoneResult(null);
    reload();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="w-12 h-12 rounded-full border-4 border-[var(--bii-emerald)] border-t-transparent animate-spin" />
      <p className="text-[var(--bii-text-soft)]">{t("loading")}</p>
    </div>
  );

  // Pick the "current" quiz — active first, then upcoming, then latest closed
  const active   = quizzes.find((q) => quizStatus(q) === "active");
  const upcoming = quizzes.find((q) => quizStatus(q) === "upcoming");
  const latest   = quizzes[0];
  const displayed = active || upcoming || latest;

  if (!displayed) return (
    <div className="max-w-lg mx-auto bii-card p-12 text-center">
      <Trophy size={56} weight="duotone" className="mx-auto mb-4 text-[var(--bii-text-soft)] opacity-30" />
      <h2 className="font-heading text-xl text-[var(--bii-emerald)] mb-2">{t("monthlyQuiz")}</h2>
      <p className="text-[var(--bii-text-soft)] text-sm">{pick("এই মাসে এখনো কুইজ প্রকাশিত হয়নি। শীঘ্রই আসছে!", "No quiz published this month yet. Coming soon!")}</p>
    </div>
  );

  if (view === "taking" && activeQuiz) {
    return (
      <QuizTaking
        quiz={activeQuiz}
        session={session}
        onDone={handleDone}
        onCancel={() => { setView("landing"); setActiveQuiz(null); setSession(null); }}
      />
    );
  }

  if (view === "result" && doneResult) {
    return (
      <QuizResult
        result={doneResult}
        quiz={activeQuiz}
        leaderboard={leaderboard}
        user={user}
        onBack={handleBack}
      />
    );
  }

  const myResult = myResults.find((r) => r.quiz_id === displayed.id);
  return (
    <QuizLanding
      quiz={displayed}
      myResult={myResult}
      leaderboard={leaderboard}
      user={user}
      onStart={() => handleStart(displayed)}
      allQuizzes={quizzes}
      allMyResults={myResults}
    />
  );
}
