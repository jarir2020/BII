import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash, CheckCircle, XCircle, SealPercent, ClipboardText } from "@phosphor-icons/react";
import { api, formatApiError } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";
import { toast } from "sonner";

const BANGLA_NUM = (n) => String(n ?? "").replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

const EMPTY = {
  code: "",
  discount_type: "flat",
  discount_value: "",
  min_order: "",
  max_uses: "",
  is_active: true,
  note: "",
};

function PromoForm({ initial, onSave, onCancel }) {
  const { pick } = useLang();
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { setErr("কোড লিখুন।"); return; }
    if (!form.discount_value) { setErr("ডিসকাউন্ট পরিমাণ লিখুন।"); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order: parseFloat(form.min_order) || 0,
        max_uses: parseInt(form.max_uses) || 0,
        is_active: form.is_active,
        note: form.note,
      };
      if (initial?.id) {
        await api.put(`/admin/promo-codes/${initial.id}`, payload);
        toast.success("আপডেট হয়েছে");
      } else {
        await api.post("/admin/promo-codes", payload);
        toast.success("প্রমো কোড তৈরি হয়েছে");
      }
      onSave();
    } catch (ex) {
      setErr(formatApiError(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">{pick("কোড (উদা: EID20)", "Code (e.g. EID20)")} *</label>
          <input
            className="bii-input font-mono uppercase"
            placeholder="SAVE50"
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">ডিসকাউন্ট ধরন</label>
          <select className="bii-input" value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
            <option value="flat">নির্দিষ্ট টাকা (৳)</option>
            <option value="percent">শতকরা (%)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            {pick("ছাড়ের পরিমাণ (৳)", "Discount Amount (৳)")} {form.discount_type === "percent" ? "(%)" : "(৳)"}  *
          </label>
          <input
            className="bii-input"
            type="number"
            min="0"
            placeholder={form.discount_type === "percent" ? "20" : "50"}
            value={form.discount_value}
            onChange={(e) => set("discount_value", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{pick("ন্যূনতম কোর্স ফি (৳)", "Min. Course Fee (৳)")}</label>
          <input className="bii-input" type="number" min="0" placeholder="0" value={form.min_order}
            onChange={(e) => set("min_order", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">সর্বোচ্চ ব্যবহার (0 = সীমাহীন)</label>
          <input className="bii-input" type="number" min="0" placeholder="0" value={form.max_uses}
            onChange={(e) => set("max_uses", e.target.value)} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--bii-emerald)]" />
            <span className="text-sm font-medium">{pick("সক্রিয়", "Active")}</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">নোট (ঐচ্ছিক)</label>
        <input className="bii-input" placeholder="কোড সম্পর্কে নোট..." value={form.note}
          onChange={(e) => set("note", e.target.value)} />
      </div>
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="px-5 py-2 rounded-xl border border-[var(--bii-border)] text-sm hover:border-red-300 hover:text-red-600 transition">
          {pick("বাতিল", "Cancel")}
        </button>
        <button type="submit" disabled={saving}
          className="bii-btn-primary flex-1">
          {saving ? pick("সংরক্ষণ হচ্ছে...", "Saving...") : initial?.id ? pick("আপডেট", "Update") : pick("প্রোমো কোড যোগ করুন", "Add Promo Code")}
        </button>
      </div>
    </form>
  );
}

export default function AdminPromoCodes() {
  const { pick } = useLang();
  const [codes, setCodes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/admin/promo-codes")
      .then((r) => setCodes(r.data || []))
      .catch(() => setCodes([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("এই প্রমো কোড মুছে দেবেন?")) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/promo-codes/${id}`);
      toast.success("মুছে দেওয়া হয়েছে");
      load();
    } catch (ex) {
      toast.error(formatApiError(ex));
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (code) => {
    try {
      await api.put(`/admin/promo-codes/${code.id}`, { ...code, is_active: !code.is_active });
      load();
    } catch (ex) {
      toast.error(formatApiError(ex));
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-[var(--bii-emerald)]">{pick("প্রমো কোড", "Promo Codes")}</h2>
          <p className="text-sm text-[var(--bii-text-soft)] mt-1">
            ডিসকাউন্ট কোড তৈরি করুন — শপে কেনাকাটায় ব্যবহার করা যাবে।
          </p>
        </div>
        {!showForm && !editing && (
          <button
            onClick={() => setShowForm(true)}
            className="bii-btn-primary flex items-center gap-2"
          >
            <Plus size={18} weight="bold" /> নতুন কোড
          </button>
        )}
      </div>

      {/* Form */}
      {(showForm || editing) && (
        <div className="bii-card p-5">
          <h3 className="font-heading text-base text-[var(--bii-emerald)] mb-4">
            {editing ? pick("প্রমো কোড এডিট", "Edit Promo Code") : pick("নতুন প্রমো কোড", "New Promo Code")}
          </h3>
          <PromoForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>
      ) : codes.length === 0 ? (
        <div className="bii-card p-10 text-center text-[var(--bii-text-soft)]">
          <SealPercent size={48} weight="duotone" className="mx-auto mb-3 opacity-30" />
          <p>{pick("কোন প্রোমো কোড নেই", "No promo codes")}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((c) => (
            <div key={c.id}
              className={`bii-card p-4 flex items-center gap-4 ${!c.is_active ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono font-bold text-lg text-[var(--bii-emerald)] bg-[var(--bii-cream)] px-2 py-0.5 rounded-lg border border-[var(--bii-border)]">
                    {c.code}
                  </code>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {c.is_active ? "সক্রিয়" : "বন্ধ"}
                  </span>
                  <span className="text-sm font-bold text-[var(--bii-gold)]">
                    {c.discount_type === "percent" ? `${c.discount_value}% ছাড়` : `৳${c.discount_value} ছাড়`}
                  </span>
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-[var(--bii-text-soft)] flex-wrap">
                  {c.min_order > 0 && <span>সর্বনিম্ন অর্ডার: ৳{c.min_order}</span>}
                  <span>ব্যবহার: {BANGLA_NUM(c.used_count ?? 0)}{c.max_uses > 0 ? `/${BANGLA_NUM(c.max_uses)}` : " (সীমাহীন)"}</span>
                  {c.note && <span>📝 {c.note}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(c)}
                  className={`p-1.5 rounded-lg border transition ${c.is_active ? "border-red-200 text-red-500 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                  title={c.is_active ? "বন্ধ করুন" : "চালু করুন"}>
                  {c.is_active ? <XCircle size={18} weight="bold" /> : <CheckCircle size={18} weight="bold" />}
                </button>
                <button onClick={() => { setEditing(c); setShowForm(false); }}
                  className="p-1.5 rounded-lg border border-[var(--bii-border)] text-[var(--bii-text-soft)] hover:border-[var(--bii-emerald)] hover:text-[var(--bii-emerald)] transition">
                  <Pencil size={18} weight="bold" />
                </button>
                <button onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition disabled:opacity-40">
                  <Trash size={18} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
