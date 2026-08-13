/**
 * NotificationPrompt
 * ──────────────────
 * Professional push-notification permission sheet.
 *
 * Rules:
 *  • Shows whenever a user is logged in AND browser permission is "default"
 *    (not yet decided) AND they haven't granted it before.
 *  • "Allow" → requests real browser permission → registers FCM token → stores
 *    bii_notif_granted=true in localStorage → never shows again.
 *  • "Later" → hides for this session (sessionStorage flag) → reappears next
 *    time the user opens / logs in.
 *  • If browser already granted: silently register token, no UI shown.
 *  • If browser denied: nothing shown (user must enable from browser settings).
 */
import React, { useEffect, useState, useCallback } from "react";
import { Bell, X, ShieldCheck, ArrowRight } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { requestFCMToken } from "../lib/firebase";
import { useLang } from "../contexts/LangContext";

const LS_GRANTED = "bii_notif_granted";
const SS_LATER   = "bii_notif_later";

async function silentRegister() {
  try {
    const token = await requestFCMToken();
    if (token) {
      await api.post("/notifications/register-device", { token, platform: "web" });
      localStorage.setItem(LS_GRANTED, "true");
    }
  } catch { /* non-critical */ }
}

export default function NotificationPrompt({ user }) {
  const { pick } = useLang();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]       = useState("");
  const [phase, setPhase]     = useState("idle"); // idle | enter | show | exit

  const shouldShow = useCallback(() => {
    if (!user) return false;
    if (!("Notification" in window)) return false;
    if (sessionStorage.getItem(SS_LATER) === "true") return false;
    if (Notification.permission === "denied") return false;
    if (Notification.permission === "granted") {
      // already allowed in browser but token not registered yet → do it silently
      silentRegister();
      return false;
    }
    return true; // permission === "default"
  }, [user]);

  useEffect(() => {
    if (!shouldShow()) return;
    // small delay so the page has time to render first
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setPhase("show"));
    }, 1800);
    return () => clearTimeout(t);
  }, [shouldShow]);

  const dismiss = () => {
    setPhase("exit");
    setTimeout(() => { setVisible(false); setPhase("idle"); }, 320);
  };

  const handleLater = () => {
    sessionStorage.setItem(SS_LATER, "true");
    dismiss();
  };

  const handleAllow = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await requestFCMToken(); // this calls Notification.requestPermission()
      if (Notification.permission === "granted") {
        if (!token) {
          setError(pick(
            "নোটিফিকেশন চালু হয়েছে, কিন্তু ডিভাইসটি নিবন্ধন করা যায়নি। ব্রাউজার রিফ্রেশ করে আবার চেষ্টা করুন।",
            "Permission was granted, but this device could not be registered. Please refresh the page and try again."
          ));
          return;
        }
        await api.post("/notifications/register-device", { token, platform: "web" });
        localStorage.setItem(LS_GRANTED, "true");
        dismiss();
      } else {
        // user denied the browser popup
        dismiss();
      }
    } catch (err) {
      setError(pick(
        "নোটিফিকেশন চালু করা যায়নি। ব্রাউজার রিফ্রেশ করে আবার চেষ্টা করুন।",
        "Notifications could not be enabled. Please refresh the page and try again."
      ));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const isEntered = phase === "show";

  return (
    <>
      {/* Backdrop — subtle, doesn't block interaction */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.35)",
          opacity: isEntered ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notification permission"
        className="fixed z-[9999] left-0 right-0 bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm w-full"
        style={{
          transform: isEntered
            ? "translateY(0) translateX(0)"
            : "translateY(100%) translateX(0)",
          // override transform for desktop centering
          ...(window.innerWidth >= 640
            ? {
                transform: isEntered
                  ? "translateX(-50%) translateY(-50%)"
                  : "translateX(-50%) translateY(-40%)",
                opacity: isEntered ? 1 : 0,
              }
            : {}),
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
          pointerEvents: isEntered ? "auto" : "none",
        }}
      >
        <div className="mx-3 mb-3 sm:mx-0 sm:mb-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ background: "var(--bii-surface, #ffffff)" }}
        >
          {/* Gradient header */}
          <div className="relative px-5 pt-7 pb-5 text-white"
            style={{
              background: "linear-gradient(135deg, #0d9f6e 0%, #065f46 60%, #064e3b 100%)",
            }}
          >
            {/* Close */}
            <button
              onClick={handleLater}
              aria-label="Close"
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition"
            >
              <X size={16} weight="bold" />
            </button>

            {/* Animated bell */}
            <div className="flex justify-center mb-3">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white/15 backdrop-blur ring-2 ring-white/30"
                style={{ animation: "bii-bell-bounce 2s ease-in-out infinite" }}
              >
                <Bell size={32} weight="duotone" className="text-white drop-shadow" />
                {/* Pulse rings */}
                <span className="absolute inset-0 rounded-full ring-2 ring-white/30"
                  style={{ animation: "bii-ping 1.8s ease-out infinite" }} />
                <span className="absolute inset-0 rounded-full ring-2 ring-white/15"
                  style={{ animation: "bii-ping 1.8s ease-out 0.4s infinite" }} />
              </div>
            </div>

            <h2 className="text-center font-heading text-lg leading-snug">
              {pick("নোটিফিকেশন চালু করুন", "Enable Notifications")}
            </h2>
            <p className="text-center text-sm text-white/80 mt-1 leading-relaxed">
              {pick(
                "নতুন কোর্স, লাইভ ক্লাস ও গুরুত্বপূর্ণ আপডেট সরাসরি আপনার ফোনে পাবেন",
                "Get new courses, live classes & important updates directly on your phone"
              )}
            </p>
          </div>

          {/* Feature list */}
          <div className="px-5 pt-4 pb-2 space-y-2.5">
            {[
              { bn: "লাইভ ক্লাসের রিমাইন্ডার",       en: "Live class reminders" },
              { bn: "নতুন কোর্স ও অফার",              en: "New courses & offers" },
              { bn: "রিওয়ার্ড ও পুরস্কারের আপডেট",   en: "Reward & prize updates" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <ShieldCheck size={16} weight="fill" className="text-[var(--bii-emerald)] flex-shrink-0" />
                <span className="text-sm text-[var(--bii-text)]">{pick(f.bn, f.en)}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-5 pt-3 pb-5 space-y-2.5">
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                {error}
              </p>
            )}
            <button
              onClick={handleAllow}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white text-sm transition active:scale-[0.97]"
              style={{
                background: loading
                  ? "#9ca3af"
                  : "linear-gradient(90deg, #0d9f6e, #065f46)",
                boxShadow: loading ? "none" : "0 4px 14px rgba(13,159,110,0.4)",
              }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Bell size={16} weight="fill" />
                  {pick("অনুমতি দিন", "Allow Notifications")}
                  <ArrowRight size={14} weight="bold" className="ml-auto" />
                </>
              )}
            </button>

            <button
              onClick={handleLater}
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium rounded-xl transition text-[var(--bii-text-soft)] hover:bg-[var(--bii-cream,#f5f5f0)] hover:text-[var(--bii-text)]"
            >
              {pick("এখন না", "Not Now")}
            </button>
          </div>

          {/* Privacy note */}
          <div className="px-5 pb-4 text-center">
            <p className="text-[10px] text-[var(--bii-text-soft)] leading-relaxed">
              {pick(
                "আপনার তথ্য সম্পূর্ণ সুরক্ষিত। যেকোনো সময় বন্ধ করতে পারবেন।",
                "Your data is fully secure. You can disable anytime."
              )}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bii-bell-bounce {
          0%,100% { transform: rotate(0deg); }
          15%      { transform: rotate(12deg); }
          30%      { transform: rotate(-10deg); }
          45%      { transform: rotate(8deg); }
          60%      { transform: rotate(-6deg); }
          75%      { transform: rotate(4deg); }
        }
        @keyframes bii-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>
    </>
  );
}
