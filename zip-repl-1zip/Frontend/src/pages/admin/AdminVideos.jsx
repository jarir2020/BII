import React, { useEffect, useState } from "react";
import { PencilSimple, Trash, Plus, X, YoutubeLogo, Warning } from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../../lib/api";
import ImageUpload from "../../components/ImageUpload";
import { useLang } from "../../contexts/LangContext";

const EMPTY = { title_bn: "", title_en: "", description: "", video_url: "", thumbnail: "", course_id: "" };

/* YouTube helpers */
function getYtId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function ytThumb(url) {
  const id = getYtId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export default function AdminVideos() {
  const { pick } = useLang();
  const [items, setItems]   = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm]     = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [err, setErr]       = useState("");

  const reload = () => api.get("/videos").then((r) => setItems(r.data || []));
  useEffect(() => {
    reload();
    api.get("/courses").then((r) => setCourses(r.data || []));
  }, []);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      if (editing) await api.put(`/videos/${editing}`, form);
      else          await api.post("/videos", form);
      setForm(EMPTY); setEditing(null); reload();
    } catch (e2) { setErr(formatApiError(e2)); }
  };

  const startEdit = (v) => {
    setEditing(v.id);
    setForm({ ...EMPTY, ...v });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const del = async (id) => {
    if (!window.confirm("এই ভিডিও ডিলিট করবেন?")) return;
    await api.delete(`/videos/${id}`); reload();
  };
  const cancel = () => { setEditing(null); setForm(EMPTY); setErr(""); };

  /* Live YouTube preview from URL */
  const previewThumb = ytThumb(form.video_url);
  const ytId         = getYtId(form.video_url);

  return (
    <div data-testid="admin-videos-page" className="grid lg:grid-cols-2 gap-5">

      {/* ── Form ── */}
      <form onSubmit={submit} className="bii-card p-5 space-y-3 lg:sticky lg:top-4 self-start">
        <h2 className="font-heading text-xl text-[var(--bii-emerald)]">
          {editing ? `✏️ ${pick("ভিডিও এডিট","Edit Video")}` : `➕ ${pick("নতুন ভিডিও যোগ","Add Video")}`}
        </h2>

        {/* YouTube URL */}
        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1 block">
            YouTube ভিডিও লিংক <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <YoutubeLogo
              size={18}
              weight="fill"
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${ytId ? "text-red-500" : "text-gray-400"}`}
            />
            <input
              data-testid="av-url"
              className="bii-input pl-9"
              placeholder="https://www.youtube.com/watch?v=..."
              value={form.video_url}
              onChange={upd("video_url")}
              required
            />
          </div>
          {/* Live preview */}
          {previewThumb && (
            <div className="mt-2 rounded-xl overflow-hidden border border-[var(--bii-border)] relative">
              <img src={previewThumb} alt="preview" className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-red-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg opacity-90">
                  <YoutubeLogo size={24} weight="fill" className="text-white" />
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                ✅ YouTube ভিডিও শনাক্ত হয়েছে
              </div>
            </div>
          )}
          {form.video_url && !ytId && (
            <div className="mt-1.5 flex items-center gap-1.5 text-amber-600 text-xs">
              <Warning size={13} /> YouTube লিংক শনাক্ত হয়নি — সরাসরি ভিডিও ফাইল লিংক হিসেবে সেভ হবে
            </div>
          )}
        </div>

        <input data-testid="av-title-bn" className="bii-input" placeholder={pick("বাংলা শিরোনাম *","Bengali Title *")} value={form.title_bn} onChange={upd("title_bn")} required />
        <input data-testid="av-title-en" className="bii-input" placeholder="English title (optional)" value={form.title_en} onChange={upd("title_en")} />
        <textarea data-testid="av-desc" className="bii-input" rows={2} placeholder={pick("ভিডিওর বিবরণ (ঐচ্ছিক)","Description (optional)")} value={form.description} onChange={upd("description")} />

        {/* Custom thumbnail — optional, auto-filled from YouTube if blank */}
        <div>
          <p className="text-xs text-[var(--bii-text-soft)] mb-1">
            {pick("কাস্টম থাম্বনেইল (ঐচ্ছিক — YouTube লিংক থাকলে স্বয়ংক্রিয় থাম্বনেইল আসে)","Custom Thumbnail (optional — auto-filled from YouTube link)")}
          </p>
          <ImageUpload value={form.thumbnail} onChange={(url) => setForm({ ...form, thumbnail: url })} label={pick("কাস্টম থাম্বনেইল","Custom Thumbnail")} testid="av-thumb-upload" />
        </div>

        <select data-testid="av-course" className="bii-input" value={form.course_id} onChange={upd("course_id")}>
          <option value="">— {pick("কোর্সের সাথে যুক্ত করুন (ঐচ্ছিক)","Link to course (optional)")} —</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title_bn}</option>)}
        </select>

        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}

        <div className="flex gap-2">
          <button data-testid="av-submit-btn" className="bii-btn-primary flex-1 flex items-center justify-center gap-1.5">
            <Plus size={16} weight="bold" /> {editing ? pick("আপডেট করুন","Update") : pick("ভিডিও যোগ করুন","Add Video")}
          </button>
          {editing && (
            <button type="button" onClick={cancel} className="bii-btn-gold px-4">
              <X size={16} weight="bold" />
            </button>
          )}
        </div>
      </form>

      {/* ── Video List ── */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg text-[var(--bii-emerald)]">{pick("ভিডিও তালিকা","Video List")} ({items.length})</h3>
        {items.length === 0 && (
          <div className="bii-card p-8 text-center text-[var(--bii-text-soft)]">
            <YoutubeLogo size={40} className="mx-auto mb-2 text-red-400 opacity-50" />
            <p className="text-sm">এখনো কোনো ভিডিও যোগ করা হয়নি</p>
          </div>
        )}
        {items.map((v) => {
          const thumb = v.thumbnail ? imgUrl(v.thumbnail) : ytThumb(v.video_url);
          const isYt  = !!getYtId(v.video_url);
          return (
            <div key={v.id} className="bii-card overflow-hidden flex flex-col" data-testid={`av-item-${v.id}`}>
              <div className="flex gap-3 p-4">
                <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <YoutubeLogo size={24} className="text-red-400" />
                    </div>
                  )}
                  {isYt && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <YoutubeLogo size={16} weight="fill" className="text-red-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-sm text-[var(--bii-emerald)] truncate">{v.title_bn}</div>
                  {v.description && <div className="text-xs text-[var(--bii-text-soft)] truncate mt-0.5">{v.description}</div>}
                  <div className={`text-[10px] mt-1 px-1.5 py-0.5 rounded inline-block ${isYt ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                    {isYt ? "🎬 YouTube" : "🔗 Direct URL"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-3 border-t border-[var(--bii-border)] pt-2">
                <button
                  data-testid={`av-edit-${v.id}`}
                  onClick={() => startEdit(v)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-1.5 rounded-lg bg-[var(--bii-emerald)]/10 text-[var(--bii-emerald)] hover:bg-[var(--bii-emerald)] hover:text-white transition"
                >
                  <PencilSimple size={15} weight="bold" /> এডিট
                </button>
                <button
                  data-testid={`av-del-${v.id}`}
                  onClick={() => del(v.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition"
                >
                  <Trash size={15} weight="bold" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
