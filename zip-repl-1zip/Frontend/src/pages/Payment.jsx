import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, Wallet, Copy, Checks, ArrowRight, Info, ClockCountdown, SealCheck, BookOpen, WhatsappLogo, Envelope } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { useAds } from "../contexts/AdsContext";
import { api } from "../lib/api";
import { showAdMobInterstitial } from "../lib/admob";
import { toast } from "sonner";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";
import FullScreenAdOverlay from "../components/FullScreenAdOverlay";

// ─── Payment Submit Page ────────────────────────────────────────────────────
export function Payment() {
  const [sp] = useSearchParams();
  const courseId = sp.get("course");
  const navigate = useNavigate();
  const { pick } = useLang();

  const [course, setCourse] = useState(null);
  const [settings, setSettings] = useState({});
  const [method, setMethod] = useState("bkash");
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (courseId) api.get(`/courses/${courseId}`).then((r) => setCourse(r.data));
    api.get("/settings").then((r) => setSettings(r.data));
  }, [courseId]);

  const activeNumber =
    method === "bkash"  ? (settings.bkash_number  || "01974911990") :
    method === "nagad"  ? (settings.nagad_number  || "01974911990") :
    method === "rocket" ? (settings.rocket_number || "01974911990") :
    "01974911990";

  const copyNumber = () => {
    navigator.clipboard.writeText(activeNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!txnId.trim()) {
      toast.error(pick("ট্রানজেকশন আইডি দিন", "Enter transaction ID"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/payments/submit", {
        course_id: courseId,
        transaction_id: txnId.trim(),
        payment_method: method,
      });
      navigate(`/payment/success?course=${courseId}&pending=1&txn=${encodeURIComponent(txnId.trim())}&method=${method}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || pick("সমস্যা হয়েছে", "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!course) return <div className="text-center py-8 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-16 sm:pb-24" data-testid="payment-page">

      {/* Course summary */}
      <div className="bii-card p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-heading text-base text-[var(--bii-emerald)]">
              {pick(course.title_bn, course.title_en)}
            </div>
            <div className="text-xs text-[var(--bii-text-soft)] mt-0.5">{course.instructor}</div>
          </div>
          <div className="font-heading text-2xl text-[var(--bii-gold)]">৳ {course.price}</div>
        </div>
      </div>

      {/* Step-by-step instructions */}
      <div className="bii-card p-5 mb-4 bg-[var(--bii-cream)]">
        <div className="flex items-center gap-2 mb-3">
          <Info size={18} className="text-[var(--bii-emerald)]" weight="fill" />
          <span className="font-heading text-sm text-[var(--bii-emerald)]">
            {pick("কীভাবে পেমেন্ট করবেন", "How to pay")}
          </span>
        </div>
        <ol className="space-y-2 text-sm text-[var(--bii-text)]">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--bii-emerald)] text-white text-xs flex items-center justify-center font-bold">১</span>
            <span>নিচে <strong>বিকাশ</strong> অথবা <strong>নগদ</strong> সিলেক্ট করুন।</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--bii-emerald)] text-white text-xs flex items-center justify-center font-bold">২</span>
            <span>দেওয়া নম্বরে <strong>Send Money</strong> করুন — ৳ {course.price}।</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--bii-emerald)] text-white text-xs flex items-center justify-center font-bold">৩</span>
            <span>পেমেন্ট সম্পন্ন হলে <strong>Transaction ID</strong> কপি করুন।</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--bii-emerald)] text-white text-xs flex items-center justify-center font-bold">৪</span>
            <span>নিচের ঘরে Transaction ID বসিয়ে <strong>সাবমিট</strong> করুন।</span>
          </li>
        </ol>
      </div>

      {/* Method selector */}
      <div className="bii-card p-5 mb-4">
        <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-3">
          {pick("পেমেন্ট মাধ্যম বেছে নিন", "Select payment method")}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { id: "bkash",  label: "বিকাশ",  color: "bg-pink-50 border-pink-300 text-pink-700" },
            { id: "nagad",  label: "নগদ",    color: "bg-orange-50 border-orange-300 text-orange-700" },
            { id: "rocket", label: "রকেট",   color: "bg-purple-50 border-purple-300 text-purple-700" },
          ].map((m) => (
            <button
              key={m.id}
              data-testid={`pay-method-${m.id}`}
              onClick={() => setMethod(m.id)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-1 transition font-heading text-base font-semibold
                ${method === m.id ? m.color + " shadow-sm" : "border-[var(--bii-border)] hover:bg-[var(--bii-cream)]"}`}
            >
              <Wallet size={26} weight="duotone" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Number display */}
        <div className="bg-[var(--bii-cream)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--bii-text-soft)] mb-0.5 uppercase tracking-wider">
              {method === "bkash" ? "বিকাশ" : method === "nagad" ? "নগদ" : "রকেট"} পার্সোনাল নম্বর
            </div>
            <div className="font-heading text-xl tracking-widest text-[var(--bii-emerald)]">
              {activeNumber}
            </div>
          </div>
          <button
            onClick={copyNumber}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[var(--bii-border)] text-sm hover:bg-[var(--bii-emerald)] hover:text-white hover:border-[var(--bii-emerald)] transition"
          >
            {copied ? <Checks size={16} /> : <Copy size={16} />}
            {copied ? "কপি হয়েছে" : "কপি করুন"}
          </button>
        </div>
      </div>

      {/* Transaction ID input */}
      <div className="bii-card p-5 mb-4">
        <label className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-2 block">
          ট্রানজেকশন আইডি (Transaction ID)
        </label>
        <input
          data-testid="txn-id-input"
          className="bii-input font-mono text-base tracking-wider"
          placeholder="যেমন: 8A3B2X1F9K..."
          value={txnId}
          onChange={(e) => setTxnId(e.target.value)}
        />
        <p className="text-xs text-[var(--bii-text-soft)] mt-1.5">
          Send Money করার পরে {method === "bkash" ? "বিকাশ" : method === "nagad" ? "নগদ" : "রকেট"} অ্যাপ থেকে Transaction ID কপি করে এখানে বসান।
        </p>
      </div>

      <BottomBanner slot="payment-bottom" />

      {/* Submit */}
      <button
        data-testid="pay-now-btn"
        onClick={handleSubmit}
        disabled={submitting || !txnId.trim()}
        className="bii-btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-60"
      >
        {submitting ? "সাবমিট হচ্ছে..." : (
          <>
            সাবমিট করুন
            <ArrowRight size={18} weight="bold" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-[var(--bii-text-soft)] mt-3">
        পেমেন্ট যাচাই হলে আপনাকে এনরোল করা হবে।
      </p>
    </div>
  );
}

// ─── Payment Success Page ───────────────────────────────────────────────────
export function PaymentSuccess() {
  const [sp] = useSearchParams();
  const courseId = sp.get("course");
  const isPending = sp.get("pending") === "1";
  const txnId = sp.get("txn") || "";
  const method = sp.get("method") || "bkash";

  const { platform, admob, isLoaded: adsLoaded, loadRewardAds, rewardAds } = useAds();
  const [showAd, setShowAd] = useState(false);
  const [course, setCourse] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (courseId) api.get(`/courses/${courseId}`).then((r) => setCourse(r.data)).catch(() => {});
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});

    // Show full-screen interstitial ad on native platform (app only)
    const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform
      ? window.Capacitor.isNativePlatform() : false;
    if (isNative && platform === "app" && adsLoaded) {
      if (admob?.interstitialUnit) {
        showAdMobInterstitial(admob.interstitialUnit).catch(() => {});
        return;
      }
      loadRewardAds("app").then((ads) => {
        if (ads.length > 0) {
          const ad = ads[Math.floor(Math.random() * ads.length)];
          setShowAd(!!ad);
        }
      });
    }
  }, [admob?.interstitialUnit, adsLoaded, courseId, platform, loadRewardAds]);

  const steps = [
    {
      icon: <SealCheck size={22} weight="fill" className="text-[var(--bii-emerald)]" />,
      text: "আপনার ট্রানজেকশন আইডি সফলভাবে পাঠানো হয়েছে।",
    },
    {
      icon: <ClockCountdown size={22} weight="fill" className="text-[var(--bii-gold)]" />,
      text: "এডমিন ২৪ ঘণ্টার মধ্যে আপনার পেমেন্ট যাচাই করবেন।",
    },
    {
      icon: <BookOpen size={22} weight="fill" className="text-[var(--bii-emerald)]" />,
      text: "যাচাই হলে কোর্সটি আপনার একাউন্টে যোগ হয়ে যাবে।",
    },
  ];

  // Show full-screen ad overlay before success content on native platform
  if (showAd) {
    const ad = rewardAds.length > 0 ? rewardAds[Math.floor(Math.random() * rewardAds.length)] : null;
    return (
      <FullScreenAdOverlay
        ad={ad}
        onComplete={() => setShowAd(false)}
        title="বিজ্ঞাপন"
        skipLabel="বাদ দিও"
        minDuration={3}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-16 sm:pb-24" data-testid="payment-success-page">

      {/* Hero success card */}
      <div className="bii-card overflow-hidden mb-4">
        {/* Green banner */}
        <div className="bg-gradient-to-r from-[var(--bii-emerald)] to-emerald-500 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4">
            <CheckCircle size={52} weight="fill" className="text-white" />
          </div>
          <h1 className="font-heading text-2xl text-white mb-1">
            সাবমিট সফল হয়েছে! 🎉
          </h1>
          <p className="text-emerald-100 text-sm">
            আপনার পেমেন্টের তথ্য আমাদের কাছে পৌঁছে গেছে
          </p>
        </div>

        {/* Course + txn info */}
        <div className="p-5">
          {course && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bii-cream)] mb-4">
              <BookOpen size={28} weight="duotone" className="text-[var(--bii-emerald)] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-0.5">কোর্স</div>
                <div className="font-heading text-sm text-[var(--bii-emerald)] truncate">
                  {course.title_bn || course.title_en}
                </div>
              </div>
              <div className="ml-auto font-heading text-base text-[var(--bii-gold)] flex-shrink-0">
                ৳ {course.price}
              </div>
            </div>
          )}

          {txnId && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bii-cream)] mb-4">
              <Wallet size={24} weight="duotone" className="text-[var(--bii-gold)] flex-shrink-0" />
              <div>
                <div className="text-xs text-[var(--bii-text-soft)] uppercase tracking-wider mb-0.5">
                  {method === "bkash" ? "বিকাশ" : "নগদ"} ট্রানজেকশন আইডি
                </div>
                <div className="font-mono text-sm text-[var(--bii-text)] font-semibold tracking-widest">
                  {txnId}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next steps */}
      <div className="bii-card p-5 mb-4">
        <h2 className="font-heading text-base text-[var(--bii-emerald)] mb-4">এরপর কী হবে?</h2>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--bii-cream)] flex items-center justify-center">
                {s.icon}
              </div>
              <p className="text-sm text-[var(--bii-text)] leading-relaxed pt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact info */}
      {(settings.whatsapp_number || settings.email) && (
        <div className="bii-card p-5 mb-4 border-l-4 border-[var(--bii-gold)]">
          <p className="text-xs text-[var(--bii-text-soft)] mb-3 uppercase tracking-wider">
            কোনো সমস্যা হলে যোগাযোগ করুন
          </p>
          <div className="flex flex-wrap gap-3">
            {settings.whatsapp_number && (
              <a
                href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm font-medium hover:bg-green-100 transition"
              >
                <WhatsappLogo size={18} weight="fill" />
                WhatsApp
              </a>
            )}
            {settings.email && (
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium hover:bg-blue-100 transition"
              >
                <Envelope size={18} weight="fill" />
                ইমেইল
              </a>
            )}
          </div>
        </div>
      )}

      <BottomBanner slot="payment-success-bottom" />

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/my-courses" className="bii-btn-primary flex-1 text-center">
          আমার কোর্সসমূহ
        </Link>
        {courseId && (
          <Link to={`/courses/${courseId}`} className="bii-btn-gold flex-1 text-center">
            কোর্স দেখুন
          </Link>
        )}
      </div>

      <p className="text-center text-xs text-[var(--bii-text-soft)] mt-4">
        জাযাকাল্লাহু খাইরান — আপনার সাথে থাকতে পেরে আমরা আনন্দিত।
      </p>
    </div>
  );
}
