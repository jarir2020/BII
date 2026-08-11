import React, { useEffect, useState } from "react";
import {
  Trash, Plus, X, PencilSimple, VideoCamera,
  CalendarBlank, ArrowSquareOut, Copy, Checks,
  Clock, BookOpen, LockSimple, GlobeSimple,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

const EMPTY = {
  title_bn: "",
  title_en: "",
  join_url: "",
  scheduled_at: "",
  description: "",
  course_id: "",
  is_free: false,
};

function formatDT(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("bn-BD", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function isUpcoming(iso) {
  if (!iso) return true;
  return new Date(iso) > new Date();
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="কপি করুন"
      className="p-1.5 rounded-lg hover:bg-[var(--bii-cream)] text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] transition"
    >
      {copied ? <Checks size={15} weight="bold" className="text-green-600" /> : <Copy size={15} />}
    </button>
  );
}

export default function AdminLive() {
  const { pick } = useLang();
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = () =>
    api.get("/live-classes").then((r) => setItems(Array.isArray(r.data) ? r.data : []));

  useEffect(() => {
    reload();
    api.get("/courses").then((r) => setCourses(Array.isArray(r.data) ? r.data : []));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload = { ...form };
      // Free class has no course binding
      if (payload.is_free) payload.course_id = "";
      if (editing) await api.put(`/live-classes/${editing}`, payload);
      else await api.post("/live-classes", payload);
      setForm(EMPTY);
      setEditing(null);
      reload();
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (l) => {
    setEditing(l.id);
    const dt = l.scheduled_at ? l.scheduled_at.slice(0, 16) : "";
    setForm({ ...EMPTY, ...l, scheduled_at: dt });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditing(null); setForm(EMPTY); setErr(""); };

  const del = async (id) => {
    if (!window.confirm("এই লাইভ ক্লাসটি ডিলিট করবেন?")) return;
    await api.delete(`/live-classes/${id}`);
    reload();
  };

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title_bn || c.title_en]));

  const freeItems     = items.filter((l) => l.is_free);
  const paidItems     = items.filter((l) => !l.is_free);
  const upcomingFree  = freeItems.filter((l) => isUpcoming(l.scheduled_at));
  const pastFree      = freeItems.filter((l) => !isUpcoming(l.scheduled_at));
  const upcomingPaid  = paidItems.filter((l) => isUpcoming(l.scheduled_at));
  const pastPaid      = paidItems.filter((l) => !isUpcoming(l.scheduled_at));

  return (
    <div data-testid="admin-live-page" className="grid lg:grid-cols-2 gap-6">

      {/* ── Form ───────────────────────────────────────────────── */}
      <form onSubmit={submit} className="bii-card p-5 space-y-4 self-start">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl text-[var(--bii-emerald)] flex items-center gap-2">
            <VideoCamera size={22} weight="duotone" />
            {editing ? pick("লাইভ ক্লাস এডিট","Edit Live Class") : pick("নতুন লাইভ ক্লাস","New Live Class")}
          </h2>
          {editing && (
            <button type="button" onClick={cancelEdit} className="text-[var(--bii-text-soft)] hover:text-red-600 transition">
              <X size={20} />
            </button>
          )}
        </div>

        {/* ── Free / Paid toggle ── */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("is_free", false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
              !form.is_free
                ? "border-[var(--bii-emerald)] bg-emerald-50 text-[var(--bii-emerald)]"
                : "border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)]"
            }`}
          >
            <LockSimple size={16} weight="bold" />
            কোর্স ক্লাস (পেইড)
          </button>
          <button
            type="button"
            onClick={() => set("is_free", true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
              form.is_free
                ? "border-[var(--bii-gold)] bg-amber-50 text-amber-700"
                : "border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-gold)]"
            }`}
          >
            <GlobeSimple size={16} weight="bold" />
            ফ্রি ক্লাস (সবার জন্য)
          </button>
        </div>

        {form.is_free && (
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
            ✅ এই ক্লাসটি <strong>সকল লগইনকৃত ব্যবহারকারী</strong> দেখতে ও জয়েন করতে পারবে — কোনো কোর্স কেনা লাগবে না।
          </div>
        )}

        {/* Title BN */}
        <div>
          <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">
            {pick("ক্লাসের শিরোনাম (বাংলা) *","Class Title (Bengali) *")}
          </label>
          <input
            data-testid="al-title-bn"
            className="bii-input"
            placeholder="যেমন: কুরআন তিলাওয়াত লাইভ ক্লাস — ১ম পর্ব"
            value={form.title_bn}
            onChange={(e) => set("title_bn", e.target.value)}
            required
          />
        </div>

        {/* Title EN */}
        <div>
          <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">
            English Title (ঐচ্ছিক)
          </label>
          <input
            data-testid="al-title-en"
            className="bii-input"
            placeholder="e.g. Quran Recitation Live Class — Part 1"
            value={form.title_en}
            onChange={(e) => set("title_en", e.target.value)}
          />
        </div>

        {/* Zoom URL */}
        <div>
          <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">
            Zoom মিটিং লিংক <span className="text-red-500">*</span>
          </label>
          <input
            data-testid="al-url"
            className="bii-input font-mono text-sm"
            placeholder="https://zoom.us/j/123456789?pwd=..."
            value={form.join_url}
            onChange={(e) => set("join_url", e.target.value)}
            required
          />
          <p className="text-xs text-[var(--bii-text-soft)] mt-1">
            Zoom অ্যাপ থেকে মিটিং তৈরি করে "Invite Link" কপি করে এখানে বসান।
          </p>
        </div>

        {/* Scheduled At */}
        <div>
          <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">
            {pick("তারিখ ও সময়","Date & Time")} <span className="text-red-500">*</span>
          </label>
          <input
            data-testid="al-time"
            className="bii-input"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => set("scheduled_at", e.target.value)}
            required
          />
        </div>

        {/* Course — only shown for paid classes */}
        {!form.is_free && (
          <div>
            <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">
              কোর্স <span className="text-red-500">*</span>
            </label>
            <select
              data-testid="al-course"
              className="bii-input"
              value={form.course_id}
              onChange={(e) => set("course_id", e.target.value)}
              required
            >
              <option value="">— {pick("কোর্স নির্বাচন করুন","Select Course")} —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title_bn || c.title_en}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--bii-text-soft)] mt-1">
              শুধু ওই কোর্সের ক্রেতারাই এই ক্লাস দেখতে পাবে।
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-1">
            বিবরণ / নির্দেশনা (ঐচ্ছিক)
          </label>
          <textarea
            data-testid="al-desc"
            className="bii-input"
            rows={3}
            placeholder="ক্লাসে কী পড়ানো হবে, কী নিয়ে আসতে হবে ইত্যাদি লিখুন..."
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {err}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            data-testid="al-submit-btn"
            className="bii-btn-primary flex-1 flex items-center justify-center gap-2"
            disabled={saving}
          >
            <Plus size={16} weight="bold" />
            {saving ? pick("সংরক্ষণ হচ্ছে...","Saving...") : editing ? pick("আপডেট","Update") : pick("লাইভ ক্লাস যোগ করুন","Add Live Class")}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} className="bii-btn-gold px-4">
              বাতিল
            </button>
          )}
        </div>
      </form>

      {/* ── List ───────────────────────────────────────────────── */}
      <div className="space-y-6">

        {items.length === 0 && (
          <div className="bii-card p-8 text-center text-[var(--bii-text-soft)]">
            <VideoCamera size={36} weight="duotone" className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">{pick("কোন লাইভ ক্লাস শিডিউল নেই","No live classes scheduled")}</p>
          </div>
        )}

        {/* ── Free classes ── */}
        {freeItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GlobeSimple size={16} className="text-amber-600" weight="duotone" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                ফ্রি ক্লাস ({freeItems.length})
              </span>
            </div>
            <div className="space-y-3">
              {upcomingFree.map((l) => <LiveCard key={l.id} l={l} courseMap={courseMap} onEdit={startEdit} onDel={del} editing={editing} />)}
              {pastFree.map((l) => <LiveCard key={l.id} l={l} courseMap={courseMap} onEdit={startEdit} onDel={del} editing={editing} />)}
            </div>
          </div>
        )}

        {/* ── Paid / course classes ── */}
        {paidItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LockSimple size={16} className="text-[var(--bii-emerald)]" weight="duotone" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--bii-emerald)]">
                কোর্স ক্লাস ({paidItems.length})
              </span>
            </div>
            <div className="space-y-3">
              {upcomingPaid.map((l) => <LiveCard key={l.id} l={l} courseMap={courseMap} onEdit={startEdit} onDel={del} editing={editing} />)}
              <div className="space-y-3 opacity-75">
                {pastPaid.map((l) => <LiveCard key={l.id} l={l} courseMap={courseMap} onEdit={startEdit} onDel={del} editing={editing} />)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveCard({ l, courseMap, onEdit, onDel, editing }) {
  const upcoming = isUpcoming(l.scheduled_at);
  const isEditingThis = editing === l.id;

  return (
    <div
      className={`bii-card overflow-hidden transition ${isEditingThis ? "ring-2 ring-[var(--bii-gold)]" : ""} ${
        l.is_free
          ? "border-l-4 border-amber-400"
          : upcoming ? "border-l-4 border-[var(--bii-emerald)]" : ""
      }`}
      data-testid={`al-item-${l.id}`}
    >
      {/* Header */}
      <div className={`px-4 py-2 flex items-center justify-between gap-2 ${
        l.is_free ? "bg-amber-50" : upcoming ? "bg-emerald-50" : "bg-gray-50"
      }`}>
        <div className="flex items-center gap-2">
          {l.is_free
            ? <GlobeSimple size={15} weight="fill" className="text-amber-600" />
            : <VideoCamera size={15} weight="fill" className={upcoming ? "text-[var(--bii-emerald)]" : "text-gray-400"} />
          }
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            l.is_free ? "text-amber-700" : upcoming ? "text-[var(--bii-emerald)]" : "text-gray-400"
          }`}>
            {l.is_free ? "ফ্রি ক্লাস" : upcoming ? "আসন্ন" : "সম্পন্ন"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(l)} className="p-1.5 rounded-lg hover:bg-white text-[var(--bii-emerald)] transition" title="এডিট">
            <PencilSimple size={15} weight="bold" />
          </button>
          <button onClick={() => onDel(l.id)} className="p-1.5 rounded-lg hover:bg-white text-red-500 transition" title="ডিলিট">
            <Trash size={15} weight="bold" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <h3 className="font-heading text-base text-[var(--bii-emerald)] leading-snug">{l.title_bn}</h3>
        {l.title_en && <p className="text-xs text-[var(--bii-text-soft)] italic">{l.title_en}</p>}

        <div className="flex items-center gap-1.5 text-sm text-[var(--bii-text-soft)]">
          <CalendarBlank size={14} className="flex-shrink-0" />
          <span>{formatDT(l.scheduled_at)}</span>
        </div>

        {l.is_free && (
          <div className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <GlobeSimple size={11} /> সকল লগইনকৃত ব্যবহারকারী
          </div>
        )}
        {!l.is_free && l.course_id && courseMap[l.course_id] && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--bii-text-soft)]">
            <BookOpen size={13} className="flex-shrink-0" />
            <span>{courseMap[l.course_id]}</span>
          </div>
        )}

        {l.description && (
          <p className="text-xs text-[var(--bii-text)] leading-relaxed border-t border-[var(--bii-border)] pt-2 mt-2">
            {l.description}
          </p>
        )}

        <div className="flex items-center gap-1 p-2 rounded-lg bg-[var(--bii-cream)] border border-[var(--bii-border)] mt-2">
          <span className="text-xs text-[var(--bii-text-soft)] font-mono truncate flex-1">{l.join_url}</span>
          <CopyBtn text={l.join_url} />
          <a href={l.join_url} target="_blank" rel="noreferrer"
            className="p-1.5 rounded-lg hover:bg-white text-[var(--bii-emerald)] transition" title="টেস্ট লিংক">
            <ArrowSquareOut size={14} weight="bold" />
          </a>
        </div>
      </div>
    </div>
  );
}
