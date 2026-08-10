import React, { useEffect, useState } from "react";
import { Bell, PaperPlaneTilt, Spinner, Plus, X, Image as ImageIcon } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { api, imgUrl } from "../lib/api";
import BottomBanner from "../components/BottomBanner";
import ImageUpload from "../components/ImageUpload";
import { toast } from "sonner";

export default function Notifications() {
  const { t, pick } = useLang();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title_bn: "", title_en: "", body_bn: "", body_en: "", image_url: "" });

  const load = () => api.get("/notifications").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!form.title_bn.trim()) { toast.error("বাংলা শিরোনাম দিন"); return; }
    setSending(true);
    try {
      // Admin sends via push-notifications endpoint (FCM + in-app)
      await api.post("/push-notifications", {
        title_bn: form.title_bn, title_en: form.title_en,
        body_bn: form.body_bn, body_en: form.body_en,
        image_url: form.image_url, click_action: "/", target: "all",
      });
      toast.success("নোটিফিকেশন পাঠানো হয়েছে!");
      setForm({ title_bn: "", title_en: "", body_bn: "", body_en: "", image_url: "" });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "পাঠানো যায়নি");
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-testid="notifications-page" className="pb-16 sm:pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl text-[var(--bii-emerald)] flex items-center gap-2">
          <Bell size={32} weight="duotone" /> {t("menuNotifications")}
        </h1>
        {isAdmin && !showForm && (
          <button onClick={() => setShowForm(true)} className="bii-btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> {pick("নোটিফিকেশন পাঠান", "Send Notification")}
          </button>
        )}
      </div>

      {/* Admin send form */}
      {isAdmin && showForm && (
        <form onSubmit={send} className="bii-card p-5 mb-6 space-y-4 border-2 border-[var(--bii-emerald)]">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg text-[var(--bii-emerald)]">📢 {pick("নোটিফিকেশন পাঠান", "Send Notification")}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-[var(--bii-text-soft)] hover:text-red-500"><X size={20} /></button>
          </div>

          <input className="bii-input" placeholder="বাংলা শিরোনাম *" value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} required />
          <input className="bii-input" placeholder="English title (optional)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
          <textarea className="bii-input min-h-[80px]" placeholder="বাংলা বার্তা" value={form.body_bn} onChange={(e) => setForm({ ...form, body_bn: e.target.value })} />
          <textarea className="bii-input min-h-[60px]" placeholder="English message (optional)" value={form.body_en} onChange={(e) => setForm({ ...form, body_en: e.target.value })} />

          <div>
            <label className="block text-sm font-medium mb-1.5"><ImageIcon size={14} className="inline mr-1" /> ব্যানার ছবি</label>
            <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} label="" testid="notif-image" />
          </div>

          <button type="submit" disabled={sending} className="bii-btn-primary w-full flex items-center justify-center gap-2 py-3">
            {sending ? <><Spinner size={18} className="animate-spin" /> পাঠানো হচ্ছে…</> : <><PaperPlaneTilt size={18} weight="fill" /> এখনই পাঠান</>}
          </button>
        </form>
      )}

      {items.length === 0 && <div className="bii-card p-8 text-center text-[var(--bii-text-soft)]">{pick("কোন নোটিফিকেশন নেই", "No notifications yet")}</div>}
      <div className="space-y-3">
        {items.map((n) => (
          <div key={n.id} className="bii-card p-5" data-testid={`notif-${n.id}`}>
            {n.image_url && <img src={imgUrl(n.image_url)} alt="" className="w-full rounded-lg mb-3 max-h-48 object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
            <h3 className="font-heading text-lg text-[var(--bii-emerald)]">{pick(n.title_bn, n.title_en)}</h3>
            <p className="text-sm text-[var(--bii-text-soft)] mt-1">{pick(n.body_bn, n.body_en)}</p>
            <div className="text-xs text-[var(--bii-text-soft)] mt-2">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <BottomBanner slot="notifications-bottom" />
    </div>
  );
}
