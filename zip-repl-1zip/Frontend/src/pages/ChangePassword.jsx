import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { api, formatApiError } from "../lib/api";

export default function ChangePassword() {
  const { t, pick } = useLang();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk(""); setLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      setOk(pick("পাসওয়ার্ড পরিবর্তন সফল", "Password updated"));
      setCurrent(""); setNext("");
    } catch (e2) { setErr(formatApiError(e2)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto py-4" data-testid="change-password-page">
      <div className="bii-card p-6">
        <h1 className="font-heading text-2xl text-[var(--bii-emerald)] mb-4">{t("changePassword")}</h1>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t("currentPassword")}</label>
            <input data-testid="cp-current" type="password" className="bii-input mt-1" value={current} onChange={(e)=>setCurrent(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">{t("newPassword")}</label>
            <input data-testid="cp-new" type="password" className="bii-input mt-1" value={next} onChange={(e)=>setNext(e.target.value)} required />
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
          {ok && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{ok}</div>}
          <button data-testid="cp-submit-btn" disabled={loading} className="bii-btn-primary w-full">
            {loading ? t("loading") : t("save")}
          </button>
        </form>
      </div>
    </div>
  );
}
