import React, { useEffect, useState } from "react";
import { PencilSimple, Trash, Plus, ShieldCheck } from "@phosphor-icons/react";
import { api, formatApiError } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";

const ALL_PERMS = [
  "dashboard", "students", "teachers", "courses", "content", "shop",
  "payments", "design", "settings", "system"
];

export default function AdminAdmins() {
  const { pick } = useLang();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", permissions: [] });
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null);

  const reload = () => api.get("/admins").then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([]));
  useEffect(() => { reload(); }, []);

  const togglePerm = (p) => setForm({ ...form, permissions: form.permissions.includes(p) ? form.permissions.filter(x => x !== p) : [...form.permissions, p] });

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      if (editing) {
        const body = { ...form }; if (!body.password) delete body.password;
        await api.put(`/admins/${editing}`, body);
      } else {
        await api.post("/admins", form);
      }
      setForm({ name: "", email: "", password: "", permissions: [] }); setEditing(null); reload();
    } catch (e2) { setErr(formatApiError(e2)); }
  };

  const startEdit = (a) => { setEditing(a.id); setForm({ name: a.name, email: a.email, password: "", permissions: a.permissions || [] }); };
  const del = async (id) => { if (!window.confirm(pick("ডিলিট?","Delete?"))) return; await api.delete(`/admins/${id}`); reload(); };

  if (user?.role !== "super_admin") {
    return <div className="bii-card p-6 text-center text-[var(--bii-text-soft)]">{pick("শুধু Super Admin এই পেজ অ্যাক্সেস করতে পারবে","Only Super Admins can access this page")}</div>;
  }

  return (
    <div data-testid="admin-admins-page" className="grid lg:grid-cols-2 gap-5">
      <form onSubmit={submit} className="bii-card p-5 space-y-3">
        <h2 className="font-heading text-xl text-[var(--bii-emerald)]">{editing ? pick("এডমিন সম্পাদনা","Edit Admin") : pick("নতুন এডমিন তৈরি","Create Admin")}</h2>
        <input data-testid="adm-name" className="bii-input" placeholder={pick("নাম","Name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input data-testid="adm-email" type="email" className="bii-input" placeholder={pick("ইমেইল","Email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={!editing} />
        <input data-testid="adm-password" type="password" className="bii-input" placeholder={editing ? pick("নতুন পাসওয়ার্ড (অপশনাল)","New Password (optional)") : pick("পাসওয়ার্ড","Password")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
        <div>
          <div className="text-sm font-medium mb-2">{pick("পারমিশন (Role & Permission)","Role & Permission")}</div>
          <div className="flex flex-wrap gap-2">
            {ALL_PERMS.map((p) => (
              <button key={p} type="button" onClick={() => togglePerm(p)} data-testid={`adm-perm-${p}`}
                className={`px-3 py-1.5 rounded-full text-xs border ${form.permissions.includes(p) ? "bg-[var(--bii-emerald)] text-white border-[var(--bii-emerald)]" : "bg-white border-[var(--bii-border)] hover:bg-[var(--bii-cream)]"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
        <button data-testid="adm-submit-btn" className="bii-btn-primary w-full"><Plus size={16} className="inline" /> {editing ? pick("আপডেট","Update") : pick("যোগ করুন","Add")}</button>
      </form>

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="bii-card p-4 flex justify-between gap-3" data-testid={`adm-item-${a.id}`}>
            <div className="flex items-center gap-3">
              <ShieldCheck size={28} weight="duotone" className={a.role === "super_admin" ? "text-[var(--bii-gold)]" : "text-[var(--bii-emerald)]"} />
              <div>
                <div className="font-heading text-[var(--bii-emerald)]">{a.name}</div>
                <div className="text-xs text-[var(--bii-text-soft)]">{a.email}</div>
                <div className="text-xs">{a.role === "super_admin" ? "Super Admin" : "Admin"} • {(a.permissions || []).length} {pick("পারমিশন","Permission")}</div>
              </div>
            </div>
            {a.role !== "super_admin" && (
              <div className="flex flex-col gap-1">
                <button data-testid={`adm-edit-${a.id}`} onClick={() => startEdit(a)} className="text-[var(--bii-emerald)] p-1"><PencilSimple size={18} /></button>
                <button data-testid={`adm-del-${a.id}`} onClick={() => del(a.id)} className="text-red-700 p-1"><Trash size={18} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
