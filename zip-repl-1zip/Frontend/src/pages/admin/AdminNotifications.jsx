import React, { useEffect, useState, useCallback } from "react";
import {
  Bell, Trash, PaperPlaneTilt, Clock, Users, BookOpen, User,
  CheckCircle, XCircle, Spinner, Warning, CalendarBlank, Image as ImageIcon,
  Link as LinkIcon, Plus, ArrowClockwise, ArrowUUpLeft,
} from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";
import { toast } from "sonner";
import ImageUpload from "../../components/ImageUpload";

/* ─── helpers ───────────────────────────────────────────────── */
const STATUS_MAP = {
  pending:   { label: "অপেক্ষমান",       cls: "bg-gray-50 text-gray-700 border-gray-200",     Icon: Clock },
  sending:   { label: "পাঠানো হচ্ছে…",  cls: "bg-blue-50 text-blue-700 border-blue-200",   Icon: Spinner },
  sent:      { label: "পাঠানো হয়েছে",   cls: "bg-green-50 text-green-700 border-green-200", Icon: CheckCircle },
  scheduled: { label: "নির্ধারিত",       cls: "bg-yellow-50 text-yellow-700 border-yellow-200", Icon: Clock },
  failed:    { label: "ব্যর্থ",          cls: "bg-red-50 text-red-700 border-red-200",        Icon: XCircle },
};

const TARGET_OPTIONS = [
  { value: "all",    label: "সকল ব্যবহারকারী",    icon: Users },
  { value: "course", label: "কোর্স অনুযায়ী",      icon: BookOpen },
  { value: "user",   label: "নির্দিষ্ট ব্যবহারকারী", icon: User },
];

const CLICK_PRESETS = [
  { label: "হোমপেজ",    value: "/" },
  { label: "কোর্সপেজ", value: "/courses" },
  { label: "প্রোফাইল",  value: "/profile" },
  { label: "নোটিস",     value: "/posts" },
  { label: "কাস্টম URL", value: "__custom__" },
];

const EMPTY_FORM = {
  title_bn: "", title_en: "",
  body_bn: "", body_en: "",
  image_url: "",
  click_action: "/",
  target_type: "all",      // "all" | "course" | "user"
  target_course: "",
  target_user: "",
  schedule_type: "now",    // "now" | "later"
  scheduled_for: "",
  click_preset: "/",
  custom_url: "",
};

/* ─── subcomponents ─────────────────────────────────────────── */
function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.sent;
  const { Icon } = s;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${s.cls}`}>
      <Icon size={12} weight={status === "sending" ? "regular" : "fill"} className={status === "sending" ? "animate-spin" : ""} />
      {s.label}
    </span>
  );
}

function TargetLabel({ target }) {
  if (!target || target === "all") return <span className="text-xs text-[var(--bii-text-soft)]"><Users size={12} className="inline mr-0.5" />সকলকে</span>;
  if (target.startsWith("course:")) return <span className="text-xs text-[var(--bii-text-soft)]"><BookOpen size={12} className="inline mr-0.5" />কোর্স</span>;
  if (target.startsWith("user:"))   return <span className="text-xs text-[var(--bii-text-soft)]"><User size={12} className="inline mr-0.5" />নির্দিষ্ট ইউজার</span>;
  return null;
}

/* ─── main component ─────────────────────────────────────────── */
export default function AdminNotifications() {
  const { pick } = useLang();
  const [tab, setTab]         = useState("send");   // "send" | "history"
  const [form, setForm]       = useState(EMPTY_FORM);
  const [courses, setCourses] = useState([]);
  const [history, setHistory] = useState([]);
  const [err, setErr]         = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── fetch data ── */
  const loadHistory = useCallback(() => {
    setLoading(true);
    api.get("/push-notifications")
      .then((r) => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("ইতিহাস লোড করা যায়নি"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get("/courses").then((r) => setCourses(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    loadHistory();
  }, [loadHistory]);

  /* ── derived state ── */
  const targetValue = (() => {
    if (form.target_type === "course" && form.target_course) return `course:${form.target_course}`;
    if (form.target_type === "user"   && form.target_user)   return `user:${form.target_user}`;
    return "all";
  })();

  const clickAction = form.click_preset === "__custom__" ? form.custom_url : form.click_preset;

  /* ── submit ── */
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.title_bn.trim()) { setErr("বাংলা শিরোনাম দিন।"); return; }
    setSending(true);
    try {
      const payload = {
        title_bn:      form.title_bn,
        title_en:      form.title_en,
        body_bn:       form.body_bn,
        body_en:       form.body_en,
        image_url:     form.image_url,
        click_action:  clickAction,
        target:        targetValue,
        scheduled_for: form.schedule_type === "later" ? form.scheduled_for || null : null,
      };
      const { data } = await api.post("/push-notifications", payload);
      setForm(EMPTY_FORM);
      setTab("history");
      loadHistory();

      if (data.status === "scheduled") {
        toast.success("নোটিফিকেশন নির্ধারিত হয়েছে!");
      } else if (data.sent_count > 0) {
        toast.success(`${data.sent_count}টি ডিভাইসে পাঠানো হয়েছে`);
      } else {
        toast.warning("কোনো ডিভাইসে পাঠানো যায়নি। ডিভাইস টোকেন চেক করুন।");
      }
    } catch (e2) {
      const msg = formatApiError(e2);
      setErr(msg);
      toast.error(msg || "পাঠানো যায়নি");
    } finally {
      setSending(false);
    }
  };

  /* ── delete ── */
  const del = async (id) => {
    if (!window.confirm("এই নোটিফিকেশন ইতিহাস থেকে ডিলিট করবেন?")) return;
    try {
      await api.delete(`/push-notifications/${id}`);
      toast.success("ডিলিট হয়েছে");
      loadHistory();
    } catch {
      toast.error("ডিলিট করা যায়নি");
    }
  };

  /* ── resend ── */
  const resend = async (id) => {
    try {
      toast.info("পুনরায় পাঠানো হচ্ছে...");
      const { data } = await api.post(`/push-notifications/${id}/resend`);
      if (data.sent > 0) {
        toast.success(`পুনরায় ${data.sent}টি ডিভাইসে পাঠানো হয়েছে`);
      } else {
        toast.warning("পুনরায় পাঠানো যায়নি");
      }
      loadHistory();
    } catch (e2) {
      toast.error(formatApiError(e2) || "পুনরায় পাঠানো যায়নি");
    }
  };

  /* ── UI ── */
  return (
    <div data-testid="admin-notif-page" className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell size={28} weight="duotone" className="text-[var(--bii-emerald)]" />
        <div>
          <h1 className="font-heading text-2xl text-[var(--bii-emerald)]">Push Notification System</h1>
          <p className="text-sm text-[var(--bii-text-soft)]">FCM দিয়ে Android, iOS ও Web-এ সরাসরি নোটিফিকেশন পাঠান</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--bii-border)]">
        {[
          { key: "send",    label: pick("নোটিফিকেশন পাঠান", "Send Notification"),  icon: PaperPlaneTilt },
          { key: "history", label: `${pick("ইতিহাস", "History")} (${history.length})`, icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition
              ${tab === key
                ? "border-[var(--bii-emerald)] text-[var(--bii-emerald)] bg-[var(--bii-cream)]"
                : "border-transparent text-[var(--bii-text-soft)] hover:text-[var(--bii-text)]"}`}
          >
            <Icon size={16} weight={tab === key ? "duotone" : "regular"} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════ SEND TAB ══════════════ */}
      {tab === "send" && (
        <div className="grid xl:grid-cols-2 gap-6">
          {/* ── Form ── */}
          <form onSubmit={submit} className="bii-card p-5 space-y-4">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1.5">📌 {pick("নোটিফিকেশন শিরোনাম", "Notification Title")}</label>
              <input
                className="bii-input"
                placeholder="বাংলা শিরোনাম *"
                value={form.title_bn}
                onChange={(e) => setForm({ ...form, title_bn: e.target.value })}
                required
              />
              <input
                className="bii-input mt-2"
                placeholder="English title (optional)"
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium mb-1.5">💬 {pick("বার্তা", "Message")}</label>
              <textarea
                className="bii-input min-h-[80px]"
                placeholder="বাংলা বার্তা"
                value={form.body_bn}
                onChange={(e) => setForm({ ...form, body_bn: e.target.value })}
              />
              <textarea
                className="bii-input min-h-[60px] mt-2"
                placeholder="English message (optional)"
                value={form.body_en}
                onChange={(e) => setForm({ ...form, body_en: e.target.value })}
              />
            </div>

            {/* Banner image */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <ImageIcon size={14} className="inline mr-1" />
                ব্যানার ছবি (বড় ছবি — Notification Banner)
              </label>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                label=""
                testid="notif-image"
              />
              <p className="text-xs text-[var(--bii-text-soft)] mt-1">
                Lock Screen ও Notification-এর নিচে বড় করে দেখাবে
              </p>
            </div>

            {/* Click action */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <LinkIcon size={14} className="inline mr-1" />
                Click করলে কোথায় যাবে?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CLICK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, click_preset: p.value })}
                    className={`text-xs px-3 py-2 rounded-lg border transition text-left
                      ${form.click_preset === p.value
                        ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white"
                        : "border-[var(--bii-border)] hover:border-[var(--bii-emerald)]"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {form.click_preset === "__custom__" && (
                <input
                  className="bii-input mt-2"
                  placeholder="যেমন: /courses/abc123 বা https://..."
                  value={form.custom_url}
                  onChange={(e) => setForm({ ...form, custom_url: e.target.value })}
                />
              )}
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <Users size={14} className="inline mr-1" />
                কাকে পাঠাবেন?
              </label>
              <div className="flex gap-2 flex-wrap">
                {TARGET_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, target_type: value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition
                      ${form.target_type === value
                        ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white"
                        : "border-[var(--bii-border)] hover:border-[var(--bii-emerald)]"}`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {form.target_type === "course" && (
                <select
                  className="bii-input mt-2"
                  value={form.target_course}
                  onChange={(e) => setForm({ ...form, target_course: e.target.value })}
                  required={form.target_type === "course"}
                >
                  <option value="">— কোর্স বেছে নিন —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title_bn || c.title_en}</option>
                  ))}
                </select>
              )}

              {form.target_type === "user" && (
                <input
                  className="bii-input mt-2"
                  placeholder="ব্যবহারকারীর User ID"
                  value={form.target_user}
                  onChange={(e) => setForm({ ...form, target_user: e.target.value })}
                  required={form.target_type === "user"}
                />
              )}
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                <CalendarBlank size={14} className="inline mr-1" />
                কখন পাঠাবেন?
              </label>
              <div className="flex gap-2">
                {[{ v: "now", l: "⚡ এখনই পাঠান" }, { v: "later", l: "🗓️ পরে পাঠান" }].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, schedule_type: v })}
                    className={`flex-1 py-2 text-sm rounded-lg border transition font-medium
                      ${form.schedule_type === v
                        ? "border-[var(--bii-emerald)] bg-[var(--bii-emerald)] text-white"
                        : "border-[var(--bii-border)] hover:border-[var(--bii-emerald)]"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {form.schedule_type === "later" && (
                <input
                  type="datetime-local"
                  className="bii-input mt-2"
                  value={form.scheduled_for}
                  onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
                  required={form.schedule_type === "later"}
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </div>

            {err && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <Warning size={16} className="mt-0.5 flex-shrink-0" />
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="bii-btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              {sending
                ? <><Spinner size={18} className="animate-spin" /> {pick("পাঠানো হচ্ছে…", "Sending...")}</>
                : <><PaperPlaneTilt size={18} weight="fill" /> {form.schedule_type === "later" ? pick("নির্ধারণ করুন", "Schedule") : pick("এখনই পাঠান", "Send Now")}</>
              }
            </button>
          </form>

          {/* ── Live Preview ── */}
          <div className="space-y-4">
            <h3 className="font-heading text-lg text-[var(--bii-emerald)]">📱 Preview</h3>

            {/* Android-style notification card */}
            <div className="rounded-2xl border border-[var(--bii-border)] bg-[#1a1a2e] text-white overflow-hidden shadow-xl">
              {/* Status bar */}
              <div className="flex items-center justify-between px-4 py-1 text-[10px] text-white/60 bg-black/30">
                <span>12:34</span>
                <span>● ● ●</span>
              </div>

              {/* Notification */}
              <div className="m-3 rounded-xl bg-white/10 backdrop-blur overflow-hidden">
                {/* Icon row */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <img src="/logo192.png" alt="" className="w-5 h-5 rounded" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  <span className="text-xs text-white/70 uppercase tracking-wide">বাঙালি ইসলামিক ইনস্টিটিউট</span>
                  <span className="ml-auto text-xs text-white/50">এইমাত্র</span>
                </div>
                {/* Content */}
                <div className="px-3 pb-2">
                  <div className="font-semibold text-sm leading-snug">
                    {form.title_bn || "নোটিফিকেশন শিরোনাম"}
                  </div>
                  {form.body_bn && (
                    <div className="text-xs text-white/80 mt-0.5 leading-snug line-clamp-2">
                      {form.body_bn}
                    </div>
                  )}
                </div>
                {/* Banner image */}
                {form.image_url && (
                  <img
                    src={imgUrl(form.image_url)}
                    alt="banner"
                    className="w-full object-contain max-h-64 bg-black/20"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
              </div>

              {/* Lock screen hint */}
              <div className="text-center text-xs text-white/30 pb-3">Lock Screen · Notification Bar · Status Bar</div>
            </div>

            {/* Send summary */}
            <div className="bii-card p-4 text-sm space-y-2">
              <div className="font-medium text-[var(--bii-emerald)]">পাঠানোর সারসংক্ষেপ</div>
              <div className="flex justify-between text-[var(--bii-text-soft)]">
                <span>প্রাপক:</span>
                <span className="font-medium text-[var(--bii-text)]">
                  {form.target_type === "all" ? "সকল ব্যবহারকারী" : form.target_type === "course" ? "কোর্সের শিক্ষার্থী" : "নির্দিষ্ট ইউজার"}
                </span>
              </div>
              <div className="flex justify-between text-[var(--bii-text-soft)]">
                <span>সময়:</span>
                <span className="font-medium text-[var(--bii-text)]">
                  {form.schedule_type === "now" ? "এখনই" : form.scheduled_for ? new Date(form.scheduled_for).toLocaleString("bn-BD") : "নির্ধারিত হয়নি"}
                </span>
              </div>
              <div className="flex justify-between text-[var(--bii-text-soft)]">
                <span>Click Action:</span>
                <span className="font-mono text-xs text-[var(--bii-emerald)] truncate max-w-[140px]">
                  {clickAction || "/"}
                </span>
              </div>
              <div className="flex justify-between text-[var(--bii-text-soft)]">
                <span>ব্যানার ছবি:</span>
                <span className="font-medium text-[var(--bii-text)]">{form.image_url ? "✅ আপলোড করা হয়েছে" : "নেই"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ HISTORY TAB ══════════════ */}
      {tab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--bii-text-soft)]">
              {pick("মোট", "Total")} {history.length}{pick("টি নোটিফিকেশন পাওয়া গেছে", " notifications found")}
            </span>
            <button
              onClick={loadHistory}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-[var(--bii-emerald)] hover:underline"
            >
              <ArrowClockwise size={14} className={loading ? "animate-spin" : ""} />
              রিফ্রেশ
            </button>
          </div>

          {loading && (
            <div className="text-center text-[var(--bii-text-soft)] py-12">
              <Spinner size={24} className="animate-spin mx-auto mb-2" />
              লোড হচ্ছে...
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="bii-card p-10 text-center">
              <Bell size={40} weight="duotone" className="text-[var(--bii-text-soft)] mx-auto mb-3" />
              <p className="text-[var(--bii-text-soft)]">{pick("এখনো কোনো নোটিফিকেশন পাঠানো হয়নি।", "No notifications sent yet.")}</p>
              <button onClick={() => setTab("send")} className="bii-btn-primary mt-4 inline-flex items-center gap-2">
                <Plus size={14} /> {pick("প্রথম নোটিফিকেশন পাঠান", "Send First Notification")}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {history.map((n) => (
              <div key={n.id} className="bii-card p-4 flex gap-4 items-start" data-testid={`notif-hist-${n.id}`}>
                {/* Banner thumbnail */}
                {n.image_url && (
                  <img
                    src={imgUrl(n.image_url)}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-heading text-base text-[var(--bii-emerald)] leading-snug">{n.title_bn}</span>
                    <StatusBadge status={n.status} />
                  </div>
                  {n.body_bn && (
                    <p className="text-sm text-[var(--bii-text-soft)] mt-0.5 line-clamp-2">{n.body_bn}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[var(--bii-text-soft)]">
                    <TargetLabel target={n.target} />
                    {n.sent_count != null && n.sent_count > 0 && (
                      <span><CheckCircle size={11} className="inline text-green-600 mr-0.5" />{n.sent_count} পৌঁছেছে</span>
                    )}
                    {n.failed_count > 0 && (
                      <span><XCircle size={11} className="inline text-red-500 mr-0.5" />{n.failed_count} ব্যর্থ</span>
                    )}
                    {n.scheduled_for && n.status === "scheduled" && (
                      <span><Clock size={11} className="inline mr-0.5" />{new Date(n.scheduled_for).toLocaleString("bn-BD")}</span>
                    )}
                    {n.sent_at && (
                      <span>{new Date(n.sent_at).toLocaleString("bn-BD")}</span>
                    )}
                    {n.click_action && (
                      <span className="font-mono text-[var(--bii-emerald)] truncate max-w-[150px]">{n.click_action}</span>
                    )}
                  </div>
                  {n.error && (
                    <div className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1 border border-red-200">
                      ❌ {n.error}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 flex-shrink-0">
                  {n.status === "failed" && (
                    <button
                      onClick={() => resend(n.id)}
                      title="পুনরায় পাঠান"
                      className="text-[var(--bii-emerald)] p-1.5 hover:bg-[var(--bii-cream)] rounded-lg transition"
                    >
                      <ArrowUUpLeft size={16} weight="bold" />
                    </button>
                  )}
                  <button
                    onClick={() => del(n.id)}
                    title="ডিলিট করুন"
                    className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
