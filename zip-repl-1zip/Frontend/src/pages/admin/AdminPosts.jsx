import React, { useEffect, useState } from "react";
import { PencilSimple, Trash, Plus, X } from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";
import ImageUpload from "../../components/ImageUpload";

const EMPTY = { title_bn: "", title_en: "", body_bn: "", body_en: "", cover_image: "", course_id: "", cta_label_bn: "বিস্তারিত দেখুন" };

export default function AdminPosts() {
  const { pick } = useLang();
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");

  const reload = () => api.get("/posts").then((r) => setItems(Array.isArray(r.data) ? r.data : []));
  useEffect(() => { reload(); api.get("/courses").then((r) => setCourses(Array.isArray(r.data) ? r.data : [])); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      if (editing) await api.put(`/posts/${editing}`, form);
      else await api.post("/posts", form);
      setForm(EMPTY); setEditing(null); reload();
    } catch (e2) { setErr(formatApiError(e2)); }
  };
  const startEdit = (p) => { setEditing(p.id); setForm({ ...EMPTY, ...p }); };
  const del = async (id) => { if (!window.confirm("ডিলিট?")) return; await api.delete(`/posts/${id}`); reload(); };

  return (
    <div data-testid="admin-posts-page" className="space-y-5">
      <h1 className="font-heading text-2xl text-[var(--bii-emerald)]">{pick("ব্লগ পোস্ট", "Blog Posts")}</h1>
    <div className="grid lg:grid-cols-2 gap-5">
      <form onSubmit={submit} className="bii-card p-5 space-y-3">
        <h2 className="font-heading text-xl text-[var(--bii-emerald)]">{editing ? pick("পোস্ট এডিট", "Edit Post") : pick("নতুন পোস্ট", "New Post")}</h2>
        <input data-testid="ap-title-bn" className="bii-input" placeholder={pick("বাংলা শিরোনাম", "Title (Bengali) *")} value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} required />
        <input data-testid="ap-title-en" className="bii-input" placeholder="English title" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
        <textarea data-testid="ap-body-bn" className="bii-input min-h-[100px]" placeholder={pick("বাংলা বডি", "Content (HTML supported)")} value={form.body_bn} onChange={(e) => setForm({ ...form, body_bn: e.target.value })} />
        <textarea data-testid="ap-body-en" className="bii-input min-h-[100px]" placeholder="English body" value={form.body_en} onChange={(e) => setForm({ ...form, body_en: e.target.value })} />
        <ImageUpload value={form.cover_image} onChange={(url) => setForm({ ...form, cover_image: url })} label={pick("পোস্টের ছবি", "Post Image")} testid="ap-cover-upload" />
        <select data-testid="ap-course" className="bii-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
          <option value="">— {pick("লিংকড কোর্স (ঐচ্ছিক)", "Linked Course (optional)")} —</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title_bn}</option>)}
        </select>
        <input data-testid="ap-cta" className="bii-input" placeholder="CTA Label (বাংলা)" value={form.cta_label_bn} onChange={(e) => setForm({ ...form, cta_label_bn: e.target.value })} />
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
        <div className="flex gap-2">
          <button data-testid="ap-submit-btn" className="bii-btn-primary flex-1"><Plus size={16} className="inline" /> {editing ? pick("আপডেট", "Update") : pick("যোগ করুন", "Add Post")}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} className="bii-btn-gold"><X size={16} className="inline" /></button>}
        </div>
      </form>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-[var(--bii-text-soft)] text-sm">{pick("কোন পোস্ট পাওয়া যায়নি", "No posts found")}</p>}
        {items.map((p) => (
          <div key={p.id} className="bii-card p-4 flex gap-3" data-testid={`ap-item-${p.id}`}>
            {p.cover_image && <img src={imgUrl(p.cover_image)} alt="" className="w-20 h-20 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="font-heading text-base text-[var(--bii-emerald)]">{p.title_bn}</div>
              <div className="text-xs text-[var(--bii-text-soft)] truncate">{p.body_bn}</div>
            </div>
            <div className="flex flex-col gap-1">
              <button data-testid={`ap-edit-${p.id}`} onClick={() => startEdit(p)} className="text-[var(--bii-emerald)] p-1"><PencilSimple size={18} /></button>
              <button data-testid={`ap-del-${p.id}`} onClick={() => del(p.id)} className="text-red-700 p-1"><Trash size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
