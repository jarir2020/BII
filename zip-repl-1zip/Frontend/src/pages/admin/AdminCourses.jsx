import React, { useEffect, useState, useCallback } from "react";
import { PencilSimple, Trash, Plus, X, Warning } from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../../lib/api";
import ImageUpload from "../../components/ImageUpload";
import { useLang } from "../../contexts/LangContext";

const EMPTY = {
  title_bn: "", title_en: "", description_bn: "", description_en: "",
  price: 0, is_free: false, cover_image: "", instructor: "", duration: "",
};

/** Renders a course cover image; hides itself and shows a warning if the file is missing. */
function CourseCover({ src, className }) {
  const [broken, setBroken] = useState(false);
  if (!src) return null;
  if (broken) return (
    <div className={`${className} flex flex-col items-center justify-center bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs text-center p-1 gap-0.5`}>
      <Warning size={16} weight="duotone" />
      <span>ছবি নষ্ট</span>
    </div>
  );
  return (
    <img
      src={imgUrl(src)}
      alt=""
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

export default function AdminCourses() {
  const { pick } = useLang();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api.get("/courses")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch((e) => setErr(formatApiError(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      const body = { ...form, price: Number(form.price) };
      if (editing) await api.put(`/courses/${editing}`, body);
      else await api.post("/courses", body);
      setForm(EMPTY);
      setEditing(null);
      reload();
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setForm({ ...EMPTY, ...c });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditing(null); setForm(EMPTY); setErr(""); };

  const del = async (id) => {
    if (!window.confirm("এই কোর্সটি ডিলিট করবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।")) return;
    try {
      await api.delete(`/courses/${id}`);
      reload();
    } catch (e2) {
      setErr(formatApiError(e2));
    }
  };

  return (
    <div data-testid="admin-courses-page" className="space-y-6">
      {/* ── Add / Edit form ── */}
      <form onSubmit={submit} className="bii-card p-5 space-y-3">
        <h2 className="font-heading text-xl text-[var(--bii-emerald)]">
          {editing ? pick("কোর্স এডিট","Edit Course") : pick("নতুন কোর্স","New Course")}
        </h2>

        <div className="grid sm:grid-cols-2 gap-3">
          <input
            data-testid="ac-title-bn"
            className="bii-input"
            placeholder={pick("কোর্সের নাম (বাংলা) *","Course Name (Bengali) *")}
            value={form.title_bn}
            onChange={(e) => setForm({ ...form, title_bn: e.target.value })}
            required
          />
          <input
            data-testid="ac-title-en"
            className="bii-input"
            placeholder={pick("কোর্সের নাম (English)","Course Name (English)")}
            value={form.title_en}
            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <textarea
            data-testid="ac-desc-bn"
            className="bii-input min-h-[80px]"
            placeholder={pick("কোর্সের বর্ণনা (বাংলা)","Description (Bengali)")}
            value={form.description_bn}
            onChange={(e) => setForm({ ...form, description_bn: e.target.value })}
          />
          <textarea
            data-testid="ac-desc-en"
            className="bii-input min-h-[80px]"
            placeholder="English description"
            value={form.description_en}
            onChange={(e) => setForm({ ...form, description_en: e.target.value })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input
            data-testid="ac-instructor"
            className="bii-input"
            placeholder={pick("কোর্স শিক্ষক","Teacher")}
            value={form.instructor}
            onChange={(e) => setForm({ ...form, instructor: e.target.value })}
          />
          <input
            data-testid="ac-duration"
            className="bii-input"
            placeholder="সময়কাল (যেমন: ৩ মাস)"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>

        <ImageUpload
          value={form.cover_image}
          onChange={(url) => setForm({ ...form, cover_image: url })}
          label={pick("কভার ফটো","Cover Photo")}
          testid="ac-cover-upload"
        />

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              data-testid="ac-free"
              type="checkbox"
              checked={form.is_free}
              onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
            />
            {pick("ফ্রি","Free")}
          </label>
          {!form.is_free && (
            <input
              data-testid="ac-price"
              type="number"
              min="0"
              className="bii-input w-40"
              placeholder={pick("কোর্স ফি (টাকা)","Course Fee (BDT)")}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          )}
        </div>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            data-testid="ac-submit-btn"
            type="submit"
            disabled={submitting}
            className="bii-btn-primary flex-1 inline-flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {submitting ? "..." : editing ? pick("আপডেট","Update") : pick("কোর্স যোগ করুন","Add Course")}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} className="bii-btn-gold inline-flex items-center gap-2">
              <X size={16} /> বাতিল
            </button>
          )}
        </div>
      </form>

      {/* ── Course list ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg text-[var(--bii-emerald)]">
            {pick("কোর্সসমূহ","Courses")} {!loading && <span className="text-sm font-normal text-[var(--bii-text-soft)]">({items.length})</span>}
          </h2>
        </div>

        {loading && (
          <div className="text-center text-[var(--bii-text-soft)] py-8">লোড হচ্ছে...</div>
        )}

        {!loading && items.length === 0 && (
          <div className="bii-card p-8 text-center text-[var(--bii-text-soft)]">
            {pick("কোন কোর্স পাওয়া যায়নি","No courses found")}
          </div>
        )}

        <div className="space-y-3">
          {items.map((c) => (
            <div
              key={c.id}
              className="bii-card p-4 flex gap-3 items-start"
              data-testid={`ac-item-${c.id}`}
            >
              {/* Cover image or placeholder */}
              <div className="w-20 h-20 flex-shrink-0">
                {c.cover_image
                  ? <CourseCover src={c.cover_image} className="w-20 h-20 rounded-lg object-cover" />
                  : <div className="w-20 h-20 rounded-lg bg-[var(--bii-cream)] border border-[var(--bii-border)] flex items-center justify-center text-[var(--bii-text-soft)] text-xs text-center">ছবি নেই</div>
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-heading text-base text-[var(--bii-emerald)] truncate">{c.title_bn}</div>
                {c.title_en && <div className="text-xs text-[var(--bii-text-soft)] truncate">{c.title_en}</div>}
                <div className="text-xs text-[var(--bii-text-soft)] mt-0.5">{c.instructor}{c.duration ? ` • ${c.duration}` : ""}</div>
                <div className="text-sm font-medium mt-1 text-[var(--bii-emerald)]">
                  {c.is_free ? pick("ফ্রি","Free") : `৳ ${c.price}`}
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  data-testid={`ac-edit-${c.id}`}
                  onClick={() => startEdit(c)}
                  title="এডিট করুন"
                  className="text-[var(--bii-emerald)] p-1.5 hover:bg-[var(--bii-cream)] rounded-lg transition"
                >
                  <PencilSimple size={18} />
                </button>
                <button
                  data-testid={`ac-del-${c.id}`}
                  onClick={() => del(c.id)}
                  title="ডিলিট করুন"
                  className="text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
