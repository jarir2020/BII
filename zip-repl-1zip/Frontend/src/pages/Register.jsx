import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { formatApiError } from "../lib/api";
import BrandLogo from "../components/BrandLogo";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const { t, pick } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await register(form);
      toast.success(pick("সফলভাবে নিবন্ধন হয়েছে!", "Account created!"));
      navigate("/home");
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto py-6" data-testid="register-page">
      <div className="bii-card p-7">
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo size={56} />
          <h1 className="font-heading text-2xl mt-3 text-[var(--bii-emerald)]">{t("register")}</h1>
          <p className="text-sm text-[var(--bii-text-soft)] mt-1">{pick("নতুন একাউন্ট তৈরি করুন", "Create a new account")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label={t("name")} testid="reg-name" value={form.name} onChange={set("name")} required />
          <Field label={t("email")} type="email" testid="reg-email" value={form.email} onChange={set("email")} required />
          <Field label={t("password")} type="password" testid="reg-password" value={form.password} onChange={set("password")} required />
          <Field label={t("phone")} testid="reg-phone" value={form.phone} onChange={set("phone")} />
          <Field label={t("address")} testid="reg-address" value={form.address} onChange={set("address")} />
          {err && <div data-testid="register-error" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
          <button data-testid="register-submit-btn" disabled={loading} className="bii-btn-primary w-full">
            {loading ? t("loading") : t("register")}
          </button>
        </form>
        <div className="text-sm text-center mt-5 text-[var(--bii-text-soft)] space-y-2">
          <div>{t("alreadyHaveAccount")}</div>
          <div><Link to="/forgot-password" className="text-[var(--bii-emerald)] font-semibold underline underline-offset-2">{t("forgotPassword")}</Link></div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, testid, ...rest }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input data-testid={testid} className="bii-input mt-1" {...rest} />
    </div>
  );
}
