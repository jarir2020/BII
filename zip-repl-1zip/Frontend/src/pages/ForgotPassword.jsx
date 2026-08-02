import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeSimple, LockKey, ArrowLeft, CheckCircle, Key } from "@phosphor-icons/react";
import { api, formatApiError } from "../lib/api";
import { useLang } from "../contexts/LangContext";
import BrandLogo from "../components/BrandLogo";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t, pick } = useLang();

  const [step, setStep]         = useState("email"); // "email" | "otp" | "done"
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState("");
  const [newPass, setNewPass]   = useState("");
  const [confirmPass, setConfirm] = useState("");
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [err, setErr]             = useState("");
  const [info, setInfo]           = useState("");

  /* ── ধাপ ১: OTP পাঠান ── */
  const sendOtp = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await api.post("/auth/forgot-password", { email });
      setInfo(r.data.message || "OTP পাঠানো হয়েছে।");
      setStep("otp");
    } catch (ex) {
      setErr(formatApiError(ex));
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP পুনরায় পাঠান ── */
  const resendOtp = async () => {
    setErr("");
    setResending(true);
    try {
      const r = await api.post("/auth/forgot-password", { email });
      setInfo(r.data.message || "নতুন OTP পাঠানো হয়েছে।");
      setOtp("");
    } catch (ex) {
      setErr(formatApiError(ex));
    } finally {
      setResending(false);
    }
  };

  /* ── ধাপ ২: OTP যাচাই + পাসওয়ার্ড পরিবর্তন ── */
  const resetPass = async (e) => {
    e.preventDefault();
    setErr("");
    if (newPass !== confirmPass) {
      setErr("পাসওয়ার্ড দুটো মিলছে না।");
      return;
    }
    if (newPass.length < 6) {
      setErr("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, new_password: newPass });
      setStep("done");
    } catch (ex) {
      setErr(formatApiError(ex));
    } finally {
      setLoading(false);
    }
  };

  /* ── প্রগ্রেস বার ── */
  const steps = [
    { key: "email", label: t("fpEmail") },
    { key: "otp",   label: t("fpOtp") },
    { key: "done",  label: t("fpDone") },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="max-w-md mx-auto py-8 px-4" data-testid="forgot-password-page">
      <div className="bii-card p-6 sm:p-8">

        {/* লোগো */}
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo size={52} />
          <h1 className="font-heading text-2xl mt-3 text-[var(--bii-emerald)]">
            {t("forgotPassword")}
          </h1>
          <p className="text-sm text-[var(--bii-text-soft)] mt-1 leading-relaxed">
            {step === "email" && pick("নিবন্ধিত ইমেইলে ৬ সংখ্যার OTP পাঠানো হবে", "A 6-digit OTP will be sent to your registered email")}
            {step === "otp"   && pick("ইমেইলে আসা OTP দিয়ে নতুন পাসওয়ার্ড সেট করুন", "Enter the OTP from your email and set a new password")}
            {step === "done"  && pick("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে", "Your password has been changed successfully")}
          </p>
        </div>

        {/* প্রগ্রেস স্টেপ */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              {/* ডট + লেবেল */}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i < stepIndex
                    ? "bg-[var(--bii-emerald)] border-[var(--bii-emerald)] text-white"
                    : i === stepIndex
                    ? "bg-[var(--bii-emerald)] border-[var(--bii-emerald)] text-white scale-110 shadow-md"
                    : "bg-white border-[var(--bii-border)] text-[var(--bii-text-soft)]"
                }`}>
                  {i < stepIndex ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] font-medium ${
                  i <= stepIndex ? "text-[var(--bii-emerald)]" : "text-[var(--bii-text-soft)]"
                }`}>
                  {s.label}
                </span>
              </div>
              {/* সংযোগ রেখা */}
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-16 mb-4 transition-all ${
                  i < stepIndex ? "bg-[var(--bii-emerald)]" : "bg-[var(--bii-border)]"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ══ ধাপ ১: ইমেইল ══ */}
        {step === "email" && (
          <form onSubmit={sendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                {pick("আপনার ইমেইল ঠিকানা", "Your email address")}
              </label>
              <div className="relative">
                <EnvelopeSimple
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]"
                />
                <input
                  data-testid="forgot-email-input"
                  type="email"
                  className="bii-input pl-9"
                  placeholder="yourname@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {err && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                ⚠️ {err}
              </div>
            )}

            <button
              data-testid="forgot-send-otp-btn"
              disabled={loading}
              className="bii-btn-primary w-full"
            >
              {loading ? t("sending") : t("fpSendOtp")}
            </button>
          </form>
        )}

        {/* ══ ধাপ ২: OTP + নতুন পাসওয়ার্ড ══ */}
        {step === "otp" && (
          <form onSubmit={resetPass} className="space-y-5">

            {/* সাফল্যের বার্তা */}
            {info && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                📧 {info}
              </div>
            )}

            {/* OTP ইনপুট */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                OTP কোড
              </label>
              <div className="relative">
                <Key
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]"
                />
                <input
                  data-testid="forgot-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="bii-input pl-9 text-center text-xl tracking-widest font-mono"
                  placeholder="_ _ _ _ _ _"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <p className="text-xs text-[var(--bii-text-soft)] mt-1.5">
                ইমেইল চেক করুন — ৬ সংখ্যার কোড পাঠানো হয়েছে (১৫ মিনিট কার্যকর)
              </p>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resending}
                className="mt-2 text-xs font-semibold text-[var(--bii-emerald)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {resending ? t("sending") : t("fpResendOtp")}
              </button>
            </div>

            {/* নতুন পাসওয়ার্ড */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                {t("newPassword")}
              </label>
              <div className="relative">
                <LockKey
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]"
                />
                <input
                  data-testid="forgot-new-pass-input"
                  type="password"
                  className="bii-input pl-9"
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* পাসওয়ার্ড নিশ্চিত */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                {t("confirmPassword")}
              </label>
              <div className="relative">
                <LockKey
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]"
                />
                <input
                  data-testid="forgot-confirm-pass-input"
                  type="password"
                  className="bii-input pl-9"
                  placeholder="আবার লিখুন"
                  value={confirmPass}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            {err && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                ⚠️ {err}
              </div>
            )}

            <button
              data-testid="forgot-reset-btn"
              disabled={loading || otp.length < 6}
              className="bii-btn-primary w-full"
            >
              {loading ? pick("পরিবর্তন হচ্ছে...", "Changing...") : t("fpChangePassword")}
            </button>

            <button
              type="button"
              onClick={() => { setStep("email"); setErr(""); setOtp(""); }}
              className="w-full text-sm text-[var(--bii-text-soft)] hover:text-[var(--bii-emerald)] transition-colors flex items-center justify-center gap-1 pt-1"
            >
              <ArrowLeft size={14} /> {pick("ইমেইল পরিবর্তন করুন", "Change email")}
            </button>
          </form>
        )}

        {/* ══ ধাপ ৩: সম্পন্ন ══ */}
        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="flex justify-center">
              <CheckCircle size={72} weight="fill" className="text-[var(--bii-emerald)]" />
            </div>
            <div>
              <p className="text-[var(--bii-emerald)] font-bold text-xl">
                {t("fpSuccess")}
              </p>
              <p className="text-sm text-[var(--bii-text-soft)] mt-2">
                {t("fpSuccessDesc")}
              </p>
            </div>
            <button
              data-testid="forgot-go-login-btn"
              onClick={() => navigate("/login")}
              className="bii-btn-primary w-full mt-2"
            >
              {t("login")}
            </button>
          </div>
        )}

        {/* লগইনে ফিরে যান */}
        {step !== "done" && (
          <div className="text-center mt-6 pt-4 border-t border-[var(--bii-border)]">
            <Link
              to="/login"
              className="text-sm text-[var(--bii-emerald)] font-semibold hover:underline flex items-center justify-center gap-1"
            >
              <ArrowLeft size={14} /> {pick("লগইনে ফিরে যান", "Back to Login")}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
