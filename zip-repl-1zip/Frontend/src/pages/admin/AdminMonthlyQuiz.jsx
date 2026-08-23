import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash, PencilSimple, X, Trophy, CheckCircle,
  XCircle, ArrowLeft, Eye, CalendarBlank, Clock,
  ListChecks, UsersThree, SealCheck, Warning,
  Bell, PaperPlaneTilt, BellRinging, Gift, Star,
  Package, Truck, HouseLine, Upload, Image as ImgIcon,
  Timer, ToggleLeft, ToggleRight, Info, Medal,
  MedalMilitary, CaretDown, CaretUp, TextAlignLeft,
  MapPin, Phone,
} from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../../lib/api";
import ImageUpload from "../../components/ImageUpload";
import { useLang } from "../../contexts/LangContext";

// ── helpers ───────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }
function defaultExamDate() {
  const now = new Date();
  const m = now.getMonth() + 2;
  const month = m > 12 ? 1 : m;
  const year  = m > 12 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-${pad(month)}-03`;
}
function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso + "T00:00:00").toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return iso; }
}
function quizStatus(q) {
  const now = new Date();
  const s = new Date(q.exam_date + "T" + (q.start_time || "00:00"));
  const e = new Date(q.exam_date + "T" + (q.end_time   || "23:59"));
  if (now < s) return "upcoming";
  if (now > e) return "closed";
  return "active";
}
const STATUS_BADGE = {
  upcoming: { label: "আসন্ন",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  active:   { label: "চলমান", cls: "bg-green-100 text-green-700 border-green-200 animate-pulse" },
  closed:   { label: "সমাপ্ত", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};
const BANGLA_OPTS = ["ক", "খ", "গ", "ঘ", "ঙ"];
const SHIP_CONFIG = {
  pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-700",  icon: <Package size={13} weight="fill" /> },
  shipped:   { label: "Shipped",   cls: "bg-blue-100 text-blue-700",    icon: <Truck size={13} weight="fill" /> },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700",  icon: <HouseLine size={13} weight="fill" /> },
};

const EMPTY_QUIZ = {
  title_bn: "", title_en: "",
  exam_date: defaultExamDate(),
  start_time: "10:00", end_time: "23:59",
  duration_minutes: 30,
  pass_marks: 5,
  rules: [],
  prize_title: "", prize_description: "", prize_image: "",
  is_active: true,
  questions: [],
};
const EMPTY_Q = { q: "", options: ["", "", "", ""], correct_index: 0, marks: 1 };

// ── Question Builder ──────────────────────────────────────────
function QuestionBuilder({ questions, onChange }) {
  const addQ  = () => onChange([...questions, { ...EMPTY_Q, options: ["", "", "", ""] }]);
  const delQ  = (i) => onChange(questions.filter((_, idx) => idx !== i));
  const setQ  = (i, k, v) => onChange(questions.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  const setOpt = (qi, oi, v) => onChange(questions.map((q, idx) => {
    if (idx !== qi) return q;
    const opts = [...q.options]; opts[oi] = v; return { ...q, options: opts };
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--bii-text)]">
          মোট {questions.length} টি প্রশ্ন
        </span>
        <span className="text-xs text-[var(--bii-text-soft)]">
          মোট নম্বর: {questions.reduce((s, q) => s + (q.marks || 1), 0)}
        </span>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="border border-[var(--bii-border)] rounded-xl p-4 bg-[var(--bii-cream)] relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--bii-emerald)]">
              প্রশ্ন {qi + 1}
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--bii-text-soft)] flex items-center gap-1">
                নম্বর:
                <input type="number" min="1" max="10" className="bii-input w-14 py-0.5 text-center text-xs"
                  value={q.marks} onChange={(e) => setQ(qi, "marks", Number(e.target.value))} />
              </label>
              <button type="button" onClick={() => delQ(qi)} className="text-red-500 hover:text-red-700 p-1">
                <Trash size={16} weight="bold" />
              </button>
            </div>
          </div>
          <textarea className="bii-input text-sm mb-3" rows={2}
            placeholder={`প্রশ্ন ${qi + 1} লিখুন...`} value={q.q}
            onChange={(e) => setQ(qi, "q", e.target.value)} required />
          <div className="space-y-2">
            {(q.options || ["", "", "", ""]).map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button type="button" onClick={() => setQ(qi, "correct_index", oi)}
                  className={`flex-shrink-0 w-7 h-7 rounded-full border-2 font-bold text-xs flex items-center justify-center transition ${
                    q.correct_index === oi
                      ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white"
                      : "border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)]"
                  }`} title="সঠিক উত্তর">
                  {BANGLA_OPTS[oi]}
                </button>
                <input className="bii-input text-sm flex-1" placeholder={`অপশন ${BANGLA_OPTS[oi]}`}
                  value={opt} onChange={(e) => setOpt(qi, oi, e.target.value)} required />
                {q.correct_index === oi && <CheckCircle size={16} weight="fill" className="text-[var(--bii-emerald)] flex-shrink-0" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--bii-text-soft)] mt-2">গোল বাটনে ক্লিক করে সঠিক উত্তর বাছুন।</p>
        </div>
      ))}

      <button type="button" onClick={addQ}
        className="w-full py-3 border-2 border-dashed border-[var(--bii-border)] rounded-xl text-sm text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition flex items-center justify-center gap-2">
        <Plus size={16} weight="bold" /> প্রশ্ন যোগ করুন
      </button>
    </div>
  );
}

// ── Rules Builder ─────────────────────────────────────────────
function RulesBuilder({ rules, onChange }) {
  const add  = () => onChange([...rules, ""]);
  const del  = (i) => onChange(rules.filter((_, idx) => idx !== i));
  const upd  = (i, v) => onChange(rules.map((r, idx) => idx === i ? v : r));
  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--bii-emerald)] text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
          <input className="bii-input flex-1 text-sm" value={rule} placeholder={`নিয়ম ${i + 1}`}
            onChange={(e) => upd(i, e.target.value)} />
          <button type="button" onClick={() => del(i)} className="text-red-400 hover:text-red-600 p-1"><Trash size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full py-2 border border-dashed border-[var(--bii-border)] rounded-lg text-xs text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition flex items-center justify-center gap-1">
        <Plus size={13} /> নিয়ম যোগ করুন
      </button>
    </div>
  );
}

// ── Winners Modal ─────────────────────────────────────────────
function WinnersModal({ quiz, results, onClose, onSaved }) {
  const [winners, setWinners] = useState(quiz.winners || []);
  const [shipping, setShipping] = useState({});
  const [saving, setSaving] = useState(false);

  // Pre-select top results as winners if none set
  useEffect(() => {
    if ((quiz.winners || []).length === 0 && results.length > 0) {
      const top = results.slice(0, 3).map((r, i) => ({
        rank: i + 1,
        user_id: r.user_id,
        name: r.user_name,
        email: r.user_email,
        phone: r.user_phone || "",
        score: r.score,
        total_marks: r.total_marks,
        prize_label: ["১ম পুরস্কার", "২য় পুরস্কার", "৩য় পুরস্কার"][i] || `${i + 1}তম`,
        shipping_status: "pending",
        tracking_number: "",
        address: r.user_address || "",
        user_address: r.user_address || "",
        user_phone: r.user_phone || "",
      }));
      setWinners(top);
    }
  }, [quiz.winners, results]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/monthly-quizzes/${quiz.id}/winners`, { winners });
      // Update shipping for each winner
      for (const uid of Object.keys(shipping)) {
        await api.patch(`/monthly-quizzes/${quiz.id}/participants/${uid}/shipping`, shipping[uid]);
      }
      onSaved();
      onClose();
    } catch (e) {
      alert(formatApiError(e));
    } finally { setSaving(false); }
  };

  const updateShip = (uid, field, val) => {
    setShipping((s) => ({ ...s, [uid]: { ...(s[uid] || {}), [field]: val } }));
    setWinners((ws) => ws.map((w) => w.user_id === uid ? { ...w, [field]: val } : w));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--bii-border)]">
          <div className="flex items-center gap-2">
            <Star size={20} weight="fill" className="text-amber-500" />
            <h2 className="font-heading text-lg text-[var(--bii-emerald)]">বিজয়ী নির্বাচন ও পুরস্কার</h2>
          </div>
          <button onClick={onClose} className="text-[var(--bii-text-soft)] hover:text-red-600"><X size={22} /></button>
        </div>

        <div className="overflow-auto flex-1 p-5 space-y-4">
          {winners.length === 0 && (
            <p className="text-center text-[var(--bii-text-soft)] py-6 text-sm">
              {results.length === 0 ? "এখনো কেউ অংশ নেননি।" : "কোনো বিজয়ী নির্বাচিত হয়নি।"}
            </p>
          )}
          {winners.map((w, i) => (
            <div key={w.user_id || i} className="border border-[var(--bii-border)] rounded-xl p-4 space-y-3">
              {/* Winner header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold">
                  {w.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--bii-text)]">{w.name || "—"}</div>
                  <div className="text-xs text-[var(--bii-text-soft)]">{w.email}</div>
                </div>
                <span className="text-sm font-bold text-[var(--bii-emerald)]">{w.score}/{w.total_marks}</span>
                <button onClick={() => setWinners(winners.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600 p-1 ml-1"><Trash size={15} /></button>
              </div>
              {/* Prize label */}
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] mb-1">পুরস্কারের নাম</label>
                <input className="bii-input text-sm" value={w.prize_label || ""}
                  onChange={(e) => setWinners(winners.map((wx, idx) => idx === i ? { ...wx, prize_label: e.target.value } : wx))}
                  placeholder="যেমন: ১ম পুরস্কার" />
              </div>
              {/* Shipping */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] mb-1">Shipping Status</label>
                  <select className="bii-input text-sm" value={w.shipping_status || "pending"}
                    onChange={(e) => updateShip(w.user_id, "shipping_status", e.target.value)}>
                    <option value="pending">⏳ Pending</option>
                    <option value="shipped">🚚 Shipped</option>
                    <option value="delivered">✅ Delivered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] mb-1">Tracking No.</label>
                  <input className="bii-input text-sm" value={w.tracking_number || ""}
                    onChange={(e) => updateShip(w.user_id, "tracking_number", e.target.value)}
                    placeholder="ট্র্যাকিং নম্বর" />
                </div>
              </div>
              {(w.address || w.user_address) && (
                <div className="flex items-start gap-1.5 text-xs text-[var(--bii-text-soft)] bg-[var(--bii-cream)] p-2 rounded-lg">
                  <MapPin size={13} className="flex-shrink-0 mt-0.5 text-[var(--bii-emerald)]" />
                  <span>{w.address || w.user_address}</span>
                </div>
              )}
              {(w.phone || w.user_phone) && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--bii-text-soft)] bg-[var(--bii-cream)] p-2 rounded-lg">
                  <Phone size={13} className="flex-shrink-0 text-[var(--bii-emerald)]" />
                  <span>{w.phone || w.user_phone}</span>
                </div>
              )}
            </div>
          ))}

          {/* Add winner from results */}
          {results.length > 0 && (
            <div>
              <p className="text-xs text-[var(--bii-text-soft)] mb-2">ফলাফল থেকে বিজয়ী যোগ করুন:</p>
              <div className="space-y-1 max-h-40 overflow-auto border border-[var(--bii-border)] rounded-xl">
                {results.filter((r) => !winners.find((w) => w.user_id === r.user_id)).slice(0, 10).map((r) => (
                  <button key={r.user_id} type="button"
                    onClick={() => setWinners([...winners, {
                      rank: winners.length + 1, user_id: r.user_id, name: r.user_name,
                      email: r.user_email, score: r.score, total_marks: r.total_marks,
                      prize_label: "", shipping_status: "pending", tracking_number: "", address: "",
                    }])}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--bii-cream)] text-left text-sm transition">
                    <span className="text-xs font-bold text-[var(--bii-text-soft)] w-6 text-center">#{r.rank}</span>
                    <span className="flex-1 truncate">{r.user_name}</span>
                    <span className="text-[var(--bii-emerald)] font-bold text-xs">{r.score}/{r.total_marks}</span>
                    <Plus size={14} className="text-[var(--bii-emerald)] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[var(--bii-border)] flex gap-3">
          <button onClick={onClose} className="bii-btn-gold px-5">বাতিল</button>
          <button onClick={save} disabled={saving} className="bii-btn-primary flex-1 flex items-center justify-center gap-2">
            <SealCheck size={17} /> {saving ? "সংরক্ষণ হচ্ছে..." : "বিজয়ী সংরক্ষণ করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Results Modal ─────────────────────────────────────────────
function ResultsModal({ quiz, onClose, onOpenWinners }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const total  = results.length;
  const passed = results.filter((r) => r.passed).length;

  useEffect(() => {
    api.get(`/monthly-quizzes/${quiz.id}/results`)
      .then((r) => setResults(r.data || []))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--bii-border)]">
          <div>
            <h2 className="font-heading text-lg text-[var(--bii-emerald)]">{quiz.title_bn} — ফলাফল</h2>
            <p className="text-xs text-[var(--bii-text-soft)] mt-0.5">{formatDate(quiz.exam_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onOpenWinners(results)}
              className="flex items-center gap-1.5 text-sm bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition">
              <Star size={15} weight="fill" /> বিজয়ী নির্বাচন
            </button>
            <button onClick={onClose} className="text-[var(--bii-text-soft)] hover:text-red-600 ml-1"><X size={22} /></button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b border-[var(--bii-border)]">
          {[
            { label: "মোট অংশগ্রহণ", val: total, icon: <UsersThree size={20} weight="duotone" />, cls: "text-blue-600" },
            { label: "পাশ", val: passed, icon: <SealCheck size={20} weight="duotone" />, cls: "text-green-600" },
            { label: "ফেল", val: total - passed, icon: <Warning size={20} weight="duotone" />, cls: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 rounded-xl bg-[var(--bii-cream)]">
              <div className={`mx-auto mb-1 ${s.cls}`}>{s.icon}</div>
              <div className={`font-heading text-2xl font-bold ${s.cls}`}>{s.val}</div>
              <div className="text-xs text-[var(--bii-text-soft)]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="overflow-auto flex-1 p-4">
          {loading && <p className="text-center text-[var(--bii-text-soft)] py-6">লোড হচ্ছে...</p>}
          {!loading && results.length === 0 && <p className="text-center text-[var(--bii-text-soft)] py-6">এখনো কেউ অংশ নেননি।</p>}
          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.id} className="border border-[var(--bii-border)] rounded-xl p-3 hover:bg-[var(--bii-cream)] transition">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-full bg-[var(--bii-gold)] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {r.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{r.user_name || "—"}
                        {r.student_id && <span className="ml-1.5 text-[10px] font-mono text-[var(--bii-text-soft)]">({r.student_id})</span>}
                      </div>
                      <div className="text-xs text-[var(--bii-text-soft)] truncate">{r.user_email}</div>
                      {r.user_phone && <div className="text-xs text-[var(--bii-text-soft)] flex items-center gap-1"><Phone size={10} /> {r.user_phone}</div>}
                      {r.user_address && <div className="text-xs text-[var(--bii-text-soft)] flex items-center gap-1"><MapPin size={10} /> {r.user_address}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono font-bold text-[var(--bii-emerald)] text-sm">{r.score}/{r.total_marks}</span>
                      <span className="text-xs text-[var(--bii-text-soft)]">
                        {r.time_taken_seconds ? `${Math.floor(r.time_taken_seconds / 60)}m ${r.time_taken_seconds % 60}s` : ""}
                      </span>
                      {r.passed
                        ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-xs"><CheckCircle size={11} weight="fill" /> পাশ</span>
                        : <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-xs"><XCircle size={11} weight="fill" /> ফেল</span>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Notification Modal ────────────────────────────────────────
function NotifModal({ quiz, onClose }) {
  const [form, setForm] = useState({
    title_bn: `📢 মাসিক কুইজ: ${quiz.title_bn}`,
    title_en: quiz.title_en ? `Monthly Quiz: ${quiz.title_en}` : "",
    body_bn: `${formatDate(quiz.exam_date)} তারিখ ${quiz.start_time} থেকে ${quiz.end_time} পর্যন্ত মাসিক কুইজ। পাশ নম্বর: ${quiz.pass_marks}। সময়: ${quiz.duration_minutes} মিনিট।`,
    body_en: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const send = async (e) => {
    e.preventDefault(); setErr(""); setSending(true);
    try {
      // Use the real push endpoint so quiz notices reach the Android system
      // tray even when the app is closed, while still being saved in-app.
      await api.post("/push-notifications", {
        ...form,
        image_url: "",
        click_action: "/quiz",
        target: "all",
      });
      setSent(true);
    }
    catch (e2) { setErr(formatApiError(e2)); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-[var(--bii-border)]">
          <div className="flex items-center gap-2">
            <BellRinging size={20} weight="duotone" className="text-[var(--bii-gold)]" />
            <h2 className="font-heading text-lg text-[var(--bii-emerald)]">নোটিফিকেশন পাঠান</h2>
          </div>
          <button onClick={onClose} className="text-[var(--bii-text-soft)] hover:text-red-600"><X size={22} /></button>
        </div>
        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle size={52} weight="fill" className="text-green-500 mx-auto mb-3" />
            <p className="font-heading text-lg text-[var(--bii-emerald)]">পাঠানো হয়েছে!</p>
            <button onClick={onClose} className="bii-btn-primary mt-5 px-8">ঠিক আছে</button>
          </div>
        ) : (
          <form onSubmit={send} className="p-5 space-y-4">
            <div><label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">বাংলা শিরোনাম *</label>
              <input className="bii-input" value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} required /></div>
            <div><label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">বাংলা বার্তা</label>
              <textarea className="bii-input" rows={3} value={form.body_bn} onChange={(e) => setForm({ ...form, body_bn: e.target.value })} /></div>
            {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}
            <div className="flex gap-3">
              <button className="bii-btn-primary flex-1 flex items-center justify-center gap-2" disabled={sending}>
                <PaperPlaneTilt size={17} weight="fill" /> {sending ? "পাঠানো হচ্ছে..." : "পাঠান"}
              </button>
              <button type="button" onClick={onClose} className="bii-btn-gold px-5">বাতিল</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function AdminMonthlyQuiz() {
  const { pick } = useLang();
  const [quizzes, setQuizzes] = useState([]);
  const [form, setForm]       = useState(EMPTY_QUIZ);
  const [editing, setEditing] = useState(null);
  const [view, setView]       = useState("list");  // "list" | "form"
  const [formTab, setFormTab] = useState("basic"); // "basic" | "prize" | "questions"
  const [err, setErr]         = useState("");
  const [saving, setSaving]   = useState(false);
  const [resultsQuiz, setResultsQuiz] = useState(null);
  const [notifQuiz, setNotifQuiz]     = useState(null);
  const [winnersQuiz, setWinnersQuiz] = useState(null);
  const [winnersResults, setWinnersResults] = useState([]);

  const reload = useCallback(() =>
    api.get("/monthly-quizzes").then((r) => setQuizzes(r.data || [])), []);
  useEffect(() => { reload(); }, [reload]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.questions.length === 0) { setErr("অন্তত একটি প্রশ্ন যোগ করুন।"); return; }
    for (const q of form.questions) {
      if (!q.q.trim()) { setErr("সব প্রশ্ন পূরণ করুন।"); return; }
      if (q.options.some((o) => !o.trim())) { setErr("সব অপশন পূরণ করুন।"); return; }
    }
    setErr(""); setSaving(true);
    try {
      if (editing) await api.put(`/monthly-quizzes/${editing}`, form);
      else await api.post("/monthly-quizzes", form);
      setForm(EMPTY_QUIZ); setEditing(null); setView("list"); reload();
    } catch (e2) { setErr(formatApiError(e2)); }
    finally { setSaving(false); }
  };

  const startEdit = (q) => {
    setEditing(q.id);
    setForm({
      title_bn: q.title_bn || "", title_en: q.title_en || "",
      exam_date: q.exam_date || defaultExamDate(),
      start_time: q.start_time || "10:00", end_time: q.end_time || "23:59",
      duration_minutes: q.duration_minutes || 30,
      pass_marks: q.pass_marks || 5,
      rules: q.rules || [],
      prize_title: q.prize_title || "", prize_description: q.prize_description || "",
      prize_image: q.prize_image || "",
      is_active: q.is_active !== false,
      questions: (q.questions || []).map((qq) => ({
        q: qq.q || "", options: qq.options || ["", "", "", ""],
        correct_index: qq.correct_index ?? 0, marks: qq.marks || 1,
      })),
    });
    setFormTab("basic");
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id) => {
    if (!window.confirm("এই কুইজটি ডিলিট করবেন?")) return;
    await api.delete(`/monthly-quizzes/${id}`); reload();
  };

  const openWinners = (results) => {
    setWinnersResults(results);
    setWinnersQuiz(resultsQuiz);
    setResultsQuiz(null);
  };

  // ── FORM VIEW ──
  if (view === "form") {
    const TABS = [
      { id: "basic",     label: "মূল তথ্য",  icon: <Info size={15} /> },
      { id: "prize",     label: pick("পুরস্কার","Prize"),   icon: <Gift size={15} /> },
      { id: "questions", label: "প্রশ্নসমূহ", icon: <ListChecks size={15} /> },
    ];
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setView("list"); setEditing(null); setForm(EMPTY_QUIZ); }}
            className="p-2 rounded-xl hover:bg-[var(--bii-cream)] text-[var(--bii-text-soft)] transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-heading text-xl text-[var(--bii-emerald)]">
              {editing ? pick("কুইজ এডিট করুন","Edit Quiz") : pick("নতুন মাসিক কুইজ তৈরি করুন","Create Monthly Quiz")}
            </h2>
            {editing && <p className="text-xs text-[var(--bii-text-soft)]">ID: {editing}</p>}
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-[var(--bii-cream)] p-1 rounded-xl mb-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setFormTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
                formTab === t.id
                  ? "bg-white shadow text-[var(--bii-emerald)]"
                  : "text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)]"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">

          {/* ─ Tab: Basic ─ */}
          {formTab === "basic" && (
            <div className="bii-card p-5 space-y-4">
              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bii-cream)] border border-[var(--bii-border)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--bii-text)]">{pick("কুইজ চালু/বন্ধ","Quiz On/Off")}</p>
                  <p className="text-xs text-[var(--bii-text-soft)]">{form.is_active ? pick("স্টুডেন্টরা দেখতে পাচ্ছে","Visible to students") : pick("লুকানো আছে","Hidden")}</p>
                </div>
                <button type="button" onClick={() => setF("is_active", !form.is_active)}
                  className={`p-1 transition ${form.is_active ? "text-[var(--bii-emerald)]" : "text-gray-400"}`}>
                  {form.is_active ? <ToggleRight size={36} weight="fill" /> : <ToggleLeft size={36} weight="fill" />}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("বাংলা শিরোনাম *","Bengali Title *")}</label>
                  <input className="bii-input" placeholder="যেমন: জুলাই ২০২৬ মাসিক কুইজ" value={form.title_bn} onChange={(e) => setF("title_bn", e.target.value)} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">English Title (ঐচ্ছিক)</label>
                  <input className="bii-input" placeholder="Monthly Quiz — July 2026" value={form.title_en} onChange={(e) => setF("title_en", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">তারিখ *</label>
                  <input type="date" className="bii-input" value={form.exam_date} onChange={(e) => setF("exam_date", e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">সময়সীমা (মিনিট)</label>
                  <input type="number" min="5" max="180" className="bii-input" value={form.duration_minutes}
                    onChange={(e) => setF("duration_minutes", Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">শুরুর সময়</label>
                  <input type="time" className="bii-input" value={form.start_time} onChange={(e) => setF("start_time", e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">শেষ সময়</label>
                  <input type="time" className="bii-input" value={form.end_time} onChange={(e) => setF("end_time", e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">পাশ নম্বর</label>
                  <input type="number" min="0" className="bii-input" value={form.pass_marks} onChange={(e) => setF("pass_marks", Number(e.target.value))} />
                </div>
              </div>

              {/* Rules */}
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-2">কুইজের নিয়মাবলী</label>
                <RulesBuilder rules={form.rules} onChange={(r) => setF("rules", r)} />
              </div>
            </div>
          )}

          {/* ─ Tab: Prize ─ */}
          {formTab === "prize" && (
            <div className="bii-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={20} weight="duotone" className="text-amber-600" />
                <h3 className="font-heading text-base text-[var(--bii-emerald)]">পুরস্কারের তথ্য</h3>
              </div>
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("পুরস্কারের শিরোনাম","Prize Title")}</label>
                <input className="bii-input" placeholder="যেমন: স্মার্টফোন + ইসলামিক বইসেট" value={form.prize_title} onChange={(e) => setF("prize_title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("বিবরণ","Description")}</label>
                <textarea className="bii-input" rows={4} placeholder="পুরস্কারের বিস্তারিত বিবরণ..."
                  value={form.prize_description} onChange={(e) => setF("prize_description", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">{pick("পুরস্কার","Prize")}</label>
                <ImageUpload
                  value={form.prize_image}
                  onChange={(url) => setF("prize_image", url)}
                  label=""
                  testid="prize-image-upload"
                />
              </div>
            </div>
          )}

          {/* ─ Tab: Questions ─ */}
          {formTab === "questions" && (
            <div className="bii-card p-5 space-y-4">
              <QuestionBuilder questions={form.questions} onChange={(qs) => setF("questions", qs)} />
            </div>
          )}

          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{err}</div>}

          <div className="flex gap-3">
            <button type="button" onClick={() => { setView("list"); setEditing(null); setForm(EMPTY_QUIZ); }}
              className="bii-btn-gold px-5">বাতিল</button>
            <button className="bii-btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              <Trophy size={17} weight="fill" />
              {saving ? pick("সংরক্ষণ হচ্ছে...","Saving...") : editing ? pick("আপডেট করুন","Update") : pick("কুইজ তৈরি করুন","Create Quiz")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-[var(--bii-emerald)] flex items-center gap-2">
            <Trophy size={26} weight="duotone" className="text-[var(--bii-gold)]" /> {pick("মাসিক কুইজ","Monthly Quiz")}
          </h2>
          <p className="text-xs text-[var(--bii-text-soft)] mt-0.5">সব কুইজ পরিচালনা, ফলাফল ও বিজয়ী নির্বাচন</p>
        </div>
        <button onClick={() => { setForm(EMPTY_QUIZ); setEditing(null); setFormTab("basic"); setView("form"); }}
          className="bii-btn-primary flex items-center gap-2">
          <Plus size={17} weight="bold" /> {pick("নতুন কুইজ","New Quiz")}
        </button>
      </div>

      {quizzes.length === 0 && (
        <div className="bii-card p-12 text-center">
          <Trophy size={48} weight="duotone" className="mx-auto mb-3 text-[var(--bii-text-soft)] opacity-30" />
          <p className="text-[var(--bii-text-soft)]">এখনো কোনো কুইজ তৈরি হয়নি।</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map((q) => {
          const st = quizStatus(q);
          const badge = STATUS_BADGE[st];
          const totalQ = (q.questions || []).length;
          const totalM = (q.questions || []).reduce((s, qq) => s + (qq.marks || 1), 0);
          const winCount = (q.winners || []).length;
          return (
            <div key={q.id} className="bii-card overflow-hidden">
              {/* Top */}
              <div className={`px-4 py-2.5 flex items-center justify-between ${st === "active" ? "bg-emerald-50" : st === "upcoming" ? "bg-blue-50" : "bg-gray-50"}`}>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${badge.cls}`}>
                  {badge.label}
                </span>
                <div className="flex items-center gap-1">
                  {!q.is_active && (
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">লুকানো</span>
                  )}
                  {winCount > 0 && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star size={9} weight="fill" /> {winCount} বিজয়ী
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <h3 className="font-heading text-base text-[var(--bii-emerald)] leading-snug">{q.title_bn}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--bii-text-soft)]">
                  <span className="flex items-center gap-1"><CalendarBlank size={11} /> {formatDate(q.exam_date)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {q.start_time}–{q.end_time}</span>
                  <span className="flex items-center gap-1"><Timer size={11} /> {q.duration_minutes || 30} মি.</span>
                  <span className="flex items-center gap-1"><ListChecks size={11} /> {totalQ} প্রশ্ন / {totalM} নম্বর</span>
                </div>
                {q.prize_title && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                    <Gift size={12} weight="fill" /> {q.prize_title}
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => startEdit(q)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--bii-border)] text-xs hover:bg-[var(--bii-cream)] transition">
                    <PencilSimple size={13} weight="bold" /> এডিট
                  </button>
                  <button onClick={() => setResultsQuiz(q)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--bii-border)] text-xs hover:bg-[var(--bii-cream)] transition">
                    <Eye size={13} weight="bold" /> ফলাফল
                  </button>
                  <button onClick={() => setNotifQuiz(q)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-amber-200 text-amber-700 text-xs hover:bg-amber-50 transition">
                    <Bell size={13} weight="bold" /> নোটিস
                  </button>
                  <button onClick={() => del(q.id)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-500 text-xs hover:bg-red-50 transition">
                    <Trash size={13} weight="bold" /> ডিলিট
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {resultsQuiz && (
        <ResultsModal
          quiz={resultsQuiz}
          onClose={() => setResultsQuiz(null)}
          onOpenWinners={openWinners}
        />
      )}
      {winnersQuiz && (
        <WinnersModal
          quiz={winnersQuiz}
          results={winnersResults}
          onClose={() => { setWinnersQuiz(null); setWinnersResults([]); }}
          onSaved={reload}
        />
      )}
      {notifQuiz && <NotifModal quiz={notifQuiz} onClose={() => setNotifQuiz(null)} />}
    </div>
  );
}
