import React, { useEffect, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import { PencilSimple, Trash, Plus, X } from "@phosphor-icons/react";
import { api, imgUrl, formatApiError } from "../../lib/api";
import ImageUpload from "../../components/ImageUpload";

const EMPTY = { name: "", email: "", password: "", phone: "", address: "", bio: "", specialization: "", photo: "" };

export default function AdminTeachers() {
  const { pick } = useLang();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");

  const reload = () => api.get("/teachers").then((r) => setItems(Array.isArray(r.data) ? r.data : []));
  useEffect(() => { reload(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      if (editing) {
        const body = { ...form }; if (!body.password) delete body.password;
        await api.put(`/teachers/${editing}`, body);
      } else {
        await api.post("/teachers", form);
      }
      setForm(EMPTY); setEditing(null); reload();
    } catch (e2) { setErr(formatApiError(e2)); }
  };

  const startEdit = (t) => { setEditing(t.id); setForm({ ...EMPTY, ...t, password: "" }); };
  const del = async (id) => { if (!window.confirm("ডিলিট?")) return; await api.delete(`/teachers/${id}`); reload(); };

  return (
    <div data-testid="admin-teachers-page" className="grid lg:grid-cols-2 gap-5">
      <form onSubmit={submit} className="bii-card p-5 space-y-3">
        <h2 className="font-heading text-xl text-[var(--bii-emerald)]">{editing ? pick("শিক্ষক প্রোফাইল এডিট", "Edit Teacher") : pick("নতুন শিক্ষক যোগ", "Add Teacher")}</h2>
        <input data-testid="tch-name" className="bii-input" placeholder={pick("নাম *", "Name *")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input data-testid="tch-email" type="email" className="bii-input" placeholder={pick("ইমেইল *", "Email *")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={!editing} />
        <input data-testid="tch-password" type="password" className="bii-input" placeholder={editing ? pick("নতুন পাসওয়ার্ড (খালি রাখলে অপরিবর্তিত)", "New Password (leave blank to keep)") : pick("পাসওয়ার্ড", "Password")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
        <input data-testid="tch-phone" className="bii-input" placeholder={pick("ফোন", "Phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input data-testid="tch-spec" className="bii-input" placeholder={pick("বিশেষজ্ঞতা (যেমন: তাজবীদ, ফিকহ)", "Expertise (e.g. Tajweed, Fiqh)")} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
        <textarea data-testid="tch-bio" className="bii-input min-h-[80px]" placeholder={pick("পরিচিতি / বিও", "Bio")} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <input data-testid="tch-address" className="bii-input" placeholder={pick("ঠিকানা", "Address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <ImageUpload value={form.photo} onChange={(url) => setForm({ ...form, photo: url })} label={pick("শিক্ষকের ছবি", "Teacher Photo")} testid="tch-photo" />
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
        <div className="flex gap-2">
          <button data-testid="tch-submit-btn" className="bii-btn-primary flex-1"><Plus size={16} className="inline" /> {editing ? pick("আপডেট", "Update") : pick("যোগ করুন", "Add")}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} className="bii-btn-gold"><X size={16} className="inline" /></button>}
        </div>
      </form>

      <div className="space-y-3">
        {items.length === 0 && <div className="bii-card p-5 text-center text-[var(--bii-text-soft)] italic">{pick("কোন শিক্ষক যোগ করা হয়নি", "No teachers added")}</div>}
        {items.map((t) => (
          <div key={t.id} className="bii-card p-4 flex gap-3" data-testid={`tch-item-${t.id}`}>
            {t.profile_photo
              ? <img src={imgUrl(t.profile_photo)} alt="" className="w-16 h-16 rounded-full object-cover" />
              : <div className="w-16 h-16 rounded-full bg-[var(--bii-cream)] flex items-center justify-center text-xl">{t.name?.[0]}</div>}
            <div className="flex-1 min-w-0">
              <div className="font-heading text-[var(--bii-emerald)]">{t.name}</div>
              <div className="text-xs text-[var(--bii-text-soft)]">{t.email}</div>
              <div className="text-xs">{t.specialization || "—"}</div>
            </div>
            <div className="flex flex-col gap-1">
              <button data-testid={`tch-edit-${t.id}`} onClick={() => startEdit(t)} className="text-[var(--bii-emerald)] p-1"><PencilSimple size={18} /></button>
              <button data-testid={`tch-del-${t.id}`} onClick={() => del(t.id)} className="text-red-700 p-1"><Trash size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
