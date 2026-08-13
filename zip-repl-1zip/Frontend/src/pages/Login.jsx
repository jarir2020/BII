import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { formatApiError } from "../lib/api";
import BrandLogo from "../components/BrandLogo";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const { t, pick } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      toast.success(pick("সফলভাবে লগইন হয়েছে!", "Welcome back!"));
      if (loggedInUser?.role === "admin" || loggedInUser?.role === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch (e2) {
      setErr(formatApiError(e2));
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto py-6" data-testid="login-page">
      <div className="bii-card p-7">
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo size={56} />
          <h1 className="font-heading text-2xl mt-3 text-[var(--bii-emerald)]">{t("login")}</h1>
          <p className="text-sm text-[var(--bii-text-soft)] mt-1">{pick("আপনার একাউন্টে প্রবেশ করুন", "Sign in to your account")}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("email")}</label>
            <input data-testid="login-email-input" type="email" className="bii-input mt-1" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">{t("password")}</label>
            <input data-testid="login-password-input" type="password" className="bii-input mt-1" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </div>
          {err && <div data-testid="login-error" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{err}</div>}
          <button data-testid="login-submit-btn" disabled={loading} className="bii-btn-primary w-full">
            {loading ? t("loading") : t("login")}
          </button>
        </form>
        <div className="text-sm text-center mt-5 space-y-2">
          <div className="text-[var(--bii-text-soft)]">{t("dontHaveAccount")}</div>
          <div>
            <Link
              to="/forgot-password"
              data-testid="login-forgot-password-link"
              className="text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] transition underline underline-offset-2"
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
