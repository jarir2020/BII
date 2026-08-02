import React, { useState } from "react";
import { Question } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { api, formatApiError } from "../lib/api";

export default function Complaint() {
  const { t, pick } = useLang();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [ok, setOk] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setOk(""); setErr(""); setLoading(true);
    try {
      await api.post("/complaints", form);
      setOk(pick("আপনার অভিযোগ / প্রশ্ন জমা হয়েছে", "Your complaint/question has been submitted"));
      setForm({ subject: "", message: "" });
    } catch (e2) { setErr(formatApiError(e2)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto" data-testid="complaint-page">
      <div className="bii-card p-6">
        <h1 className="font-heading text-2xl text-[var(--bii-emerald)] mb-2 flex items-center gap-2"><Question size={24} weight="duotone" /> {t("menuComplaint")}</h1>
        <p className="text-sm text-[var(--bii-text-soft)] mb-4">{pick("আপনার অভিযোগ বা প্রশ্ন জানান", "Submit your complaint or question")}</p>
        <form onSubmit={submit} className="space-y-3">
          <input data-testid="complaint-subject" className="bii-input" placeholder={t("subject")} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <textarea data-testid="complaint-message" className="bii-input min-h-[140px]" placeholder={t("message")} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
          {ok && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{ok}</div>}
          <button data-testid="complaint-submit-btn" disabled={loading} className="bii-btn-primary w-full">{loading ? t("loading") : t("submit")}</button>
        </form>
      </div>
    </div>
  );
}
