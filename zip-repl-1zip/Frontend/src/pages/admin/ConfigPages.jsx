import React, { useEffect, useState } from "react";
import ConfigEditor from "../../components/ConfigEditor";
import { api, formatApiError } from "../../lib/api";
import { useLang } from "../../contexts/LangContext";

export const AdminHomepage = () => (
  <ConfigEditor configKey="homepage" title="হোমপেজ সেটিংস"
    description="লগইন করা স্টুডেন্টের হোমপেজ কাস্টমাইজ করুন।"
    fields={[
      { name: "hero_title", label: "হিরো টাইটেল", placeholder: "স্বাগতম..." },
      { name: "hero_subtitle", label: "হিরো সাবটাইটেল" },
      { name: "show_posts", label: "পোস্ট সেকশন দেখাবে?", type: "checkbox" },
      { name: "show_hadith", label: "দৈনিক হাদীস দেখাবে?", type: "checkbox" },
      { name: "show_announcement", label: "ঘোষণা ব্যানার দেখাবে?", type: "checkbox" },
      { name: "announcement_text", label: "ঘোষণা টেক্সট", type: "textarea" },
    ]} />
);

export const AdminWelcomePage = () => (
  <ConfigEditor configKey="welcome_page" title="ওয়েলকাম পেজ সেটিংস"
    description="গেস্ট ভিজিটরদের লেন্ডিং পেজ কাস্টমাইজ করুন।"
    fields={[
      { name: "hero_title_bn", label: "মূল শিরোনাম (বাংলা)" },
      { name: "hero_title_en", label: "Main Heading (English)" },
      { name: "hero_subtitle", label: "সাবটাইটেল", type: "textarea" },
      { name: "hero_bg_image", label: "হিরো ব্যাকগ্রাউন্ড URL", placeholder: "https://..." },
      { name: "about_text_bn", label: "আমাদের সম্পর্কে (বাংলা)", type: "textarea" },
      { name: "about_text_en", label: "About (English)", type: "textarea" },
      { name: "show_features", label: "ফিচার কার্ড দেখাবে?", type: "checkbox" },
      { name: "show_how_it_works", label: "How-it-works দেখাবে?", type: "checkbox" },
    ]} />
);

export const AdminTheme = () => (
  <ConfigEditor configKey="theme" title="থিম ও কালার সেটিংস"
    description="সাইটের প্রধান রঙ ও থিম পরিবর্তন করুন।"
    fields={[
      { name: "primary_color", label: "প্রাইমারি কালার (Emerald)", type: "color", default: "#0A422B" },
      { name: "accent_color", label: "অ্যাকসেন্ট কালার (Gold)", type: "color", default: "#D4AF37" },
      { name: "background_color", label: "ব্যাকগ্রাউন্ড কালার", type: "color", default: "#F9F6F0" },
      { name: "text_color", label: "টেক্সট কালার", type: "color", default: "#11261E" },
      { name: "font_heading", label: "Heading Font", placeholder: "Tiro Bangla" },
      { name: "font_body", label: "Body Font", placeholder: "Hind Siliguri" },
      { name: "dark_mode_default", label: "ডিফল্ট ডার্ক মোড", type: "checkbox" },
    ]} />
);

export const AdminSeo = () => (
  <ConfigEditor configKey="seo" title="SEO সেটিংস"
    description="সার্চ ইঞ্জনরে জন্য মেটা তথ্য।"
    fields={[
      { name: "site_title", label: "Site Title (Browser Tab)" },
      { name: "meta_description", label: "Meta Description", type: "textarea" },
      { name: "meta_keywords", label: "Keywords (comma)", type: "textarea" },
      { name: "og_image", label: "Social Share Image URL" },
      { name: "google_analytics_id", label: "Google Analytics ID", placeholder: "G-XXXXXXX" },
      { name: "google_search_console", label: "Google Search Console Verification" },
      { name: "facebook_pixel", label: "Facebook Pixel ID" },
      { name: "robots_txt", label: "robots.txt content", type: "textarea" },
    ]} />
);

export const AdminFirebase = () => (
  <ConfigEditor configKey="firebase" title="Firebase কনফিগারেশন"
    description="Push Notification / Firebase Cloud Messaging কনফিগ। (প্রযোগ পরবর্তী আপডেটে)"
    fields={[
      { name: "api_key", label: "Firebase API Key" },
      { name: "auth_domain", label: "Auth Domain" },
      { name: "project_id", label: "Project ID" },
      { name: "storage_bucket", label: "Storage Bucket" },
      { name: "messaging_sender_id", label: "Messaging Sender ID" },
      { name: "app_id", label: "App ID" },
      { name: "vapid_key", label: "VAPID Key (Web Push)" },
      { name: "service_account_json", label: "Service Account JSON", type: "textarea" },
    ]} />
);

export const AdminSecurity = () => (
  <ConfigEditor configKey="security" title="সিকিউরিটি সেটিংস"
    description="সাইট সিকিউরিটি কনফিগ।"
    fields={[
      { name: "min_password_length", label: "ন্যূনতম পাসওয়ার্ড দৈর্ঘ্য", type: "number" },
      { name: "require_strong_password", label: "Strong পাসওয়ার্ড বাধ্যতামূলক?", type: "checkbox" },
      { name: "max_login_attempts", label: "সর্বোচ্চ লগইন চেষ্টা", type: "number" },
      { name: "lockout_minutes", label: "লকআউট সময় (মিনিট)", type: "number" },
      { name: "session_timeout_hours", label: "Session টাইমআউট (ঘণ্টা)", type: "number" },
      { name: "enable_2fa", label: "Two-Factor Auth Enable?", type: "checkbox" },
      { name: "allowed_ips", label: "এডমিনের জন্য Allowed IPs (কমা)", type: "textarea" },
    ]} />
);

export const AdminMaintenance = () => (
  <ConfigEditor configKey="maintenance" title="মেন্টেন্যান্স মোড"
    description="চালু করলে শুধুমাত্র এডমিন সাইট ব্যবহার করতে পারবে।"
    fields={[
      { name: "enabled", label: "মেন্টেন্যান্স মোড সক্রিয়", type: "checkbox" },
      { name: "message", label: "ভিজিটরদের জন্য মেসেজ", type: "textarea", placeholder: "সাইট আপডেট হচ্ছে, কিছুক্ষণ পরে চেষ্টা করুন।" },
      { name: "estimated_back_time", label: "আনুমানিক সময়" },
    ]} />
);

export const AdminPaymentGateways = () => (
  <ConfigEditor configKey="payment_gateways" title="পেমেন্ট গেটওয়ে সেটিংস"
    description="বিকাশ, নগদ, রকেট, কার্ড পেমেন্ট keys এখানে যোগ করুন।"
    fields={[
      { name: "bkash_enabled", label: "bKash সক্রিয়?", type: "checkbox" },
      { name: "bkash_app_key", label: "bKash App Key" },
      { name: "bkash_app_secret", label: "bKash App Secret" },
      { name: "bkash_username", label: "bKash Username" },
      { name: "bkash_password", label: "bKash Password", type: "password" },
      { name: "bkash_mode", label: "Mode", type: "select", options: ["sandbox", "live"] },
      { name: "nagad_enabled", label: "Nagad সক্রিয়?", type: "checkbox" },
      { name: "nagad_merchant_id", label: "Nagad Merchant ID" },
      { name: "nagad_merchant_key", label: "Nagad Merchant Key" },
      { name: "rocket_enabled", label: "Rocket সক্রিয়?", type: "checkbox" },
      { name: "stripe_enabled", label: "Stripe সক্রিয়?", type: "checkbox" },
      { name: "stripe_publishable_key", label: "Stripe Publishable Key" },
      { name: "stripe_secret_key", label: "Stripe Secret Key", type: "password" },
      { name: "sslcommerz_enabled", label: "SSLCommerz সক্রিয়?", type: "checkbox" },
      { name: "sslcommerz_store_id", label: "SSLCommerz Store ID" },
      { name: "sslcommerz_store_password", label: "SSLCommerz Store Password", type: "password" },
      { name: "sslcommerz_mode", label: "SSLCommerz Mode", type: "select", options: ["sandbox", "live"] },
    ]} />
);

// ── Toggle switch component ──────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        on ? "bg-[var(--bii-emerald)]" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ── Platform toggles (Web + App side-by-side) ────────────────
function PlatformToggles({ webOn, appOn, onWebChange, onAppChange }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium">ওয়েব</span>
        <Toggle on={!!webOn} onChange={onWebChange} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium">অ্যাপ</span>
        <Toggle on={!!appOn} onChange={onAppChange} />
      </div>
    </div>
  );
}

// ── Ad slot card (platform-aware) ────────────────────────────
function getAdSlots(pick) {
  return [
    // ── প্রধান পেজ ──────────────────────────────────────────────
    { group: pick("প্রধান প্েজ","Main Pages") },
    { key: "header",          label: pick("হেডার ব্যানার","Header Banner"),             desc: "সব প্েজের একদম উপরে",                      icon: "⬆️", unitKey: "ad_unit_header"          },
    { key: "footer",          label: pick("ফুটার ব্যানার","Footer Banner"),             desc: "সব প্েজের একদম নিচে",                      icon: "⬇️", unitKey: "ad_unit_footer"          },
    { key: "home",            label: pick("হোম প্েজ","Home Page"),                       desc: "হোম প্েজের মাঝখানে",                       icon: "🏠", unitKey: "ad_unit_home"            },
    { key: "sidebar",         label: pick("সাইডবার","Sidebar"),                         desc: "প্েজের পাশে সাইডবারে",                    icon: "↔️", unitKey: "ad_unit_sidebar"         },
    // ── কোর্স ও কন্টেন্ট ────────────────────────────────────────
    { group: pick("কোর্স ও কন্টেন্ট","Course & Content") },
    { key: "courses",         label: pick("কোর্স তালিকা প্েজ","Course List Page"),       desc: "কোর্স তালিকার উপরে",                      icon: "📚", unitKey: "ad_unit_courses"         },
    { key: "in_content",      label: pick("কোর্স বিবরণ","Course Description"),          desc: "কোর্স কেনার আগে বিবরণের নিচে",           icon: "📄", unitKey: "ad_unit_in_content"      },
    { key: "courses-bottom",   label: pick("আমাদের কোর্সসমূহ","Our Courses"),                         desc: "আমাদের কোর্সসমূহ পেজের নিচে ব্যানার",          icon: "🎓", unitKey: "ad_unit_courses_bottom" },
    { key: "videos",          label: pick("ভিডিও প্েজ","Video Page"),                    desc: "ভিডিও তালিকার উপরে",                      icon: "🎬", unitKey: "ad_unit_videos"          },
    // ── পেমেন্ট ও কেনাকাটা ──────────────────────────────────────
    { group: pick("পেমেন্ট ও কেনাকাটা","Payment & Shop") },
    { key: "payment_form",    label: pick("পেমেন্ট ফর্ম","Payment Form"),               desc: "কোর্স কেনার সময় সাবমিট বাটনের উপরে",    icon: "💳", unitKey: "ad_unit_payment_form"    },
    { key: "payment_success", label: pick("পেমেন্ট সফল প্েজ","Payment Success Page"),    desc: "পেমেন্ট হওয়ার পরে ধন্যবাদ প্েজে",         icon: "✅", unitKey: "ad_unit_payment_success" },
    { key: "shop",            label: pick("শপ প্েজ","Shop Page"),                        desc: "শপের পণ্য তালিকার উপরে",                  icon: "🛒", unitKey: "ad_unit_shop"            },
    // ── অন্যান্য ────────────────────────────────────────────────
    { group: pick("অন্যান্য","Other") },
    { key: "quiz_result",       label: pick("কুইজ ফলাফল","Quiz Result"),                desc: "কুইজের পরে ফলাফল দেখানোর নিচে",            icon: "🏆", unitKey: "ad_unit_quiz_result"       },
    { key: "quiz_interstitial", label: pick("কুইজ ইন্টারস্টিশিয়াল","Quiz Interstitial"), desc: "কুইজ উত্তর দেওয়ার পরে overlay বিজ্ঞাপন",  icon: "📋", unitKey: "ad_unit_quiz_interstitial" },
    { key: "post_bottom",       label: pick("ব্লগ/পোস্টের নিচে","Below Blog/Post"),     desc: "পোস্ট পড়া শেষ হলে নিচে",                  icon: "📝", unitKey: "ad_unit_post_bottom"       },
    { key: "reward_zone",       label: pick("রিওয়ার্ড জোন","Reward Zone"),               desc: "ভিডিও দেখে জিতুন প্েজে",                 icon: "🎁", unitKey: "ad_unit_reward_zone"        },
    { key: "library",          label: pick("লাইব্রেরি প্েজ","Library Page"),              desc: "বই ও রিসোর্স তালিকার উপরে",               icon: "📖", unitKey: "ad_unit_library"            },
    { key: "home_bottom",      label: pick("হোম প্েজ নিচ","Home Page Bottom"),            desc: "হোম প্েজের একদম নিচেকো",                  icon: "🏠", unitKey: "ad_unit_home_bottom"        },
    { key: "course_details_bottom", label: pick("কোর্স বিবরণ নিচ","Course Details Bottom"), desc: "কোর্স বিবরণ প্েজের একদম নিচেকো",       icon: "📄", unitKey: "ad_unit_in_content"         },
    { key: "my_course_detail_bottom", label: pick("আমার কোর্স নিচ","My Course Detail Bottom"), desc: "আমার কোর্স প্েজের একদম নিচেকো",       icon: "🎓", unitKey: "ad_unit_lesson_between"     },
    { key: "payment_bottom",   label: pick("পেমেন্ট ফর্ম নিচ","Payment Form Bottom"),     desc: "পেমেন্ট ফরম প্েজের একদম নিচেকো",          icon: "💳", unitKey: "ad_unit_payment_form"       },
    { key: "payment_success_bottom", label: pick("পেমেন্ট সফল নিচ","Payment Success Bottom"), desc: "পেমেন্ট সফল প্েজের একদম নিচেকো",    icon: "✅", unitKey: "ad_unit_payment_success"    },
  ];
}

function AdSlotCard({ slot, webEnabled, appEnabled, webUnitId, appUnitId, onWebToggle, onAppToggle, onWebUnitChange, onAppUnitChange }) {
  const anyEnabled = !!webEnabled || !!appEnabled;
  return (
    <div className={`rounded-xl border transition-all ${
      anyEnabled
        ? "border-[var(--bii-emerald)] bg-emerald-50/50"
        : "border-[var(--bii-border)] bg-gray-50 opacity-70"
    }`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{slot.icon}</span>
          <div>
            <div className={`font-semibold text-sm ${anyEnabled ? "text-[var(--bii-emerald)]" : "text-[var(--bii-text-soft)]"}`}>
              {slot.label}
            </div>
            <div className="text-xs text-[var(--bii-text-soft)]">{slot.desc}</div>
          </div>
        </div>
        <PlatformToggles
          webOn={webEnabled}
          appOn={appEnabled}
          onWebChange={onWebToggle}
          onAppChange={onAppToggle}
        />
      </div>
      {anyEnabled && (
        <div className="px-4 pb-3 pt-0 space-y-2">
          {webEnabled && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--bii-emerald)] mb-1">🌐 Website Ad Unit ID</div>
              <input
                className="bii-input text-xs font-mono"
                placeholder="Website AdSense Unit ID"
                value={webUnitId}
                onChange={(e) => onWebUnitChange(e.target.value)}
              />
            </div>
          )}
          {appEnabled && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--bii-gold)] mb-1">📱 App Ad Unit ID</div>
              <input
                className="bii-input text-xs font-mono"
                placeholder="App AdMob Unit ID"
                value={appUnitId}
                onChange={(e) => onAppUnitChange(e.target.value)}
              />
            </div>
          )}
          <div className="text-[10px] text-[var(--bii-text-soft)] mt-1">
            Website and App IDs are separate. Enter each ID from its own ad platform.
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminAds() {
  const { pick } = useLang();
  const AD_SLOTS = getAdSlots(pick);
  const [cfg, setCfg]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk]       = useState("");
  const [err, setErr]     = useState("");

  useEffect(() => {
    api.get("/configs/ads")
      .then((r) => setCfg(r.data || {}))
      .catch(() => setCfg({}));
  }, []);

  if (!cfg) return <div className="text-center py-10 text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>;

  const set = (k, v) => setCfg((prev) => ({ ...prev, [k]: v }));

  // ── Slot helpers: read from nested `slots` object with backwards-compat fallback
  const rawSlots = cfg.slots || {};
  const slotWebEnabled  = (key) => {
    const s = rawSlots[key];
    if (s && typeof s === "object") return !!s.web;
    return cfg[`ad_slot_${key}_enabled`] !== false;
  };
  const slotAppEnabled  = (key) => {
    const s = rawSlots[key];
    if (s && typeof s === "object") return !!s.app;
    return cfg[`ad_slot_${key}_enabled`] !== false;
  };
  const toggleSlotWeb  = (key, val) => {
    const prev = rawSlots[key];
    const next = (prev && typeof prev === "object")
      ? { ...prev, web: val }
      : { web: val, app: slotAppEnabled(key) };
    set("slots", { ...rawSlots, [key]: next });
  };
  const toggleSlotApp  = (key, val) => {
    const prev = rawSlots[key];
    const next = (prev && typeof prev === "object")
      ? { ...prev, app: val }
      : { web: slotWebEnabled(key), app: val };
    set("slots", { ...rawSlots, [key]: next });
  };
  const rawAdUnits = cfg.ad_units || {};
  const unitVal = (unitKey, platform) => rawAdUnits[unitKey]?.[platform] || cfg[unitKey] || "";
  const setUnitVal = (unitKey, platform, value) => {
    const previous = rawAdUnits[unitKey] || {};
    set("ad_units", { ...rawAdUnits, [unitKey]: { ...previous, [platform]: value } });
  };

  const save = async () => {
    setErr(""); setOk(""); setSaving(true);
    try {
      await api.put("/configs/ads", cfg);
      setOk("✓ সফলভািবে সংরক্ষিত হয়েছে");
      setTimeout(() => setOk(""), 3000);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  // Global toggles: enabled_web / enabled_app (with fallback to legacy ads_enabled)
  const webOn  = !!cfg.enabled_web  || !!cfg.ads_enabled;
  const appOn  = !!cfg.enabled_app;

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Global switches: web & app ── */}
      <div className="bii-card p-5 space-y-4">
        <div>
          <h2 className="font-heading text-2xl text-[var(--bii-emerald)] mb-1">বিস্তৃপ্ত স্ত্রিংশ</h2>
          <p className="text-sm text-[var(--bii-text-soft)]">
            প্ল্যাটফরম অনুযায়ী আলাদা চালু/বন্ধ করুন এবং Publisher ID স্েট করুন।
          </p>
        </div>

        {/* Web global toggle */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--bii-border)] bg-[var(--bii-cream)] px-4 py-3">
          <div>
            <div className="font-semibold text-[var(--bii-text)] flex items-center gap-2">
              <span className="text-lg">🌐</span> ওয়েব (Web)
            </div>
            <div className="text-xs text-[var(--bii-text-soft)]">ওয়েবসাইটে সব বিস্তৃপ্ত চালু/বন্ধ</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${webOn ? "text-emerald-700" : "text-gray-400"}`}>
              {webOn ? "চালু" : "বন্ধ"}
            </span>
            <Toggle on={webOn} onChange={(v) => set("enabled_web", v)} />
          </div>
        </div>

        {/* App global toggle */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--bii-border)] bg-[var(--bii-cream)] px-4 py-3">
          <div>
            <div className="font-semibold text-[var(--bii-text)] flex items-center gap-2">
              <span className="text-lg">📱</span> অ্যাপ (App)
            </div>
            <div className="text-xs text-[var(--bii-text-soft)]">Android অ্যাপে AdMob বিজ্ঞাপন চালু/বন্ধ</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${appOn ? "text-emerald-700" : "text-gray-400"}`}>
              {appOn ? "চালু" : "বন্ধ"}
            </span>
            <Toggle on={appOn} onChange={(v) => set("enabled_app", v)} />
          </div>
        </div>
      </div>

      {/* ── Website ad account ── */}
      <div className="bii-card p-5 space-y-3 border-l-4 border-[var(--bii-emerald)]">
        <div>
          <div className="font-semibold text-[var(--bii-text)]">🌐 Website Ad Account — Google AdSense</div>
          <div className="text-xs text-[var(--bii-text-soft)] mt-1 leading-relaxed">
            This account is used only for advertisements displayed on the website in a browser. It is separate from the Android app AdMob account below.
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">Website Publisher ID</div>
          <input
            className="bii-input font-mono text-sm"
            placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            value={cfg.publisher_web || cfg.adsense_publisher_web || cfg.adsense_publisher_id || ""}
            onChange={(e) => set("publisher_web", e.target.value)}
          />
          <div className="text-[10px] text-[var(--bii-text-soft)] mt-1">
            Get this from Google AdSense → Account → Publisher ID. Example: <code className="bg-gray-100 rounded px-1">ca-pub-1234567890123456</code>
          </div>
        </div>
      </div>

      {/* ── Per-slot selection ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-[var(--bii-text)]">কোন জায়গায় বিস্তৃপ্ত দেখাবে?</div>
          <div className="text-xs text-[var(--bii-text-soft)]">— প্ল্যাটফরম অনুযায়ী নির্বাচন করুন</div>
        </div>
        {!webOn && !appOn && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-3 py-2">
            ⚠️ ওয়েব বা অ্যাপ কোনোটতাই বিস্তৃপ্ত চালু নেই। উপরের টগল চালু করুন।
          </div>
        )}
        {AD_SLOTS.map((slot, i) =>
          slot.group ? (
            <div key={`grp-${i}`} className="pt-2 pb-1">
              <div className="text-[11px] uppercase tracking-widest font-semibold text-[var(--bii-emerald)] border-b border-[var(--bii-border)] pb-1">
                {slot.group}
              </div>
            </div>
          ) : (
            <AdSlotCard
              key={slot.key}
              slot={slot}
              webEnabled={slotWebEnabled(slot.key)}
              appEnabled={slotAppEnabled(slot.key)}
              webUnitId={unitVal(slot.unitKey, "web")}
              appUnitId={unitVal(slot.unitKey, "app")}
              onWebToggle={(v) => toggleSlotWeb(slot.key, v)}
              onAppToggle={(v) => toggleSlotApp(slot.key, v)}
              onWebUnitChange={(v) => setUnitVal(slot.unitKey, "web", v)}
              onAppUnitChange={(v) => setUnitVal(slot.unitKey, "app", v)}
            />
          )
        )}
      </div>

      {/* ── App ad account ── */}
      <div className="bii-card p-5 space-y-3 border-l-4 border-[var(--bii-gold)]">
        <div>
          <div className="font-semibold text-[var(--bii-text)]">📱 App Ad Account — Google AdMob</div>
          <div className="text-xs text-[var(--bii-text-soft)] mt-1 leading-relaxed">
            This account is used only by the Android app through the AdMob SDK. Do not enter the website AdSense Publisher ID here. The App ID and each ad unit must come from the same AdMob app.
          </div>
        </div>
        {[
          { key: "admob_app_id",            label: "App ID",            ph: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" },
          { key: "admob_banner_unit",       label: "Banner Unit ID",    ph: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
          { key: "admob_interstitial_unit", label: "Interstitial Unit", ph: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
          { key: "admob_rewarded_unit",     label: "Rewarded Unit",     ph: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
          { key: "admob_native_unit",       label: "Native Unit",       ph: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
        ].map((f) => (
          <div key={f.key}>
            <div className="text-xs uppercase tracking-widest text-[var(--bii-text-soft)] mb-1">{f.label}</div>
            <input className="bii-input font-mono text-sm" placeholder={f.ph}
              value={cfg[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
        <div className="text-[10px] text-[var(--bii-text-soft)] pt-1 leading-relaxed">
          App ID and ad unit IDs are available in Google AdMob → Apps → your Android app. Website AdSense settings do not control these app ads.
        </div>
      </div>

      {/* ── Save ── */}
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
      {ok  && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{ok}</div>}
      <button onClick={save} disabled={saving} className="bii-btn-primary w-full">
        {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
      </button>
    </div>
  );
}

export const AdminLegal = () => (
  <div className="space-y-6">
    {[
      { doc: "terms",   label: "ব্যবহারের শর্তাবলী (Terms of Service)" },
      { doc: "privacy", label: "গোপনীয়ত্া নীতি (Privacy Policy)" },
      { doc: "refund",  label: "রিফান্ড নীতি (Refund Policy)" },
    ].map(({ doc, label }) => (
      <ConfigEditor
        key={doc}
        configKey={`legal_${doc}`}
        title={label}
        description="বাংলা ও ইংরেজি কন্টেন্ট দিন। **bold** সিনট্যাক্স সমর্থিত।"
        fields={[
          { name: "content_bn", label: "বাংলা কন্টেন্ট", type: "textarea", rows: 10,
            placeholder: "**শিরোনাম**\n\nঅনুচ্ছেদের লেখা এখানে দিন।" },
          { name: "content_en", label: "English Content", type: "textarea", rows: 6,
            placeholder: "**Heading**\n\nContent here." },
        ]}
      />
    ))}
  </div>
);

export const AdminSocial = () => (
  <ConfigEditor configKey="social_links" title="সোশ্যাল মিডিয়া লিংক"
    description="ফুটার ও যোগাযোগ প্েজে দেখাবে।"
    fields={[
      { name: "facebook", label: "Facebook URL" },
      { name: "youtube", label: "YouTube URL" },
      { name: "instagram", label: "Instagram URL" },
      { name: "twitter", label: "Twitter / X URL" },
      { name: "linkedin", label: "LinkedIn URL" },
      { name: "tiktok", label: "TikTok URL" },
      { name: "whatsapp_channel", label: "WhatsApp Channel URL" },
      { name: "telegram", label: "Telegram URL" },
    ]} />
);

// "Contact Info" is just the existing /api/settings page link — covered by AdminSettings already
export const AdminContactInfo = () => (
  <ConfigEditor configKey="contact_extra" title="যোগাযোগ তথ্য (এক্সট্রা)"
    description="সাধারণ স্ত্রিংশ প্েজেও মূল যোগাযোগ আছে। এখানে অতিরিক্ত যোগাযোগ লোকেশন/অফিস ইত্যাদি।"
    fields={[
      { name: "office_hours", label: "অফিস সময়", placeholder: "শনি-বৃহঃ ৯:০০-১৭:০০" },
      { name: "support_phone", label: "সাপোর্ট ফোন" },
      { name: "support_email", label: "সাপোর্ট ইমেল" },
      { name: "billing_email", label: "বিলিং ইমেল" },
      { name: "alternate_address", label: "অতিরিক্ত শাখা ঠিকানা", type: "textarea" },
      { name: "google_map_embed", label: "Google Map Embed URL", type: "textarea" },
    ]} />
);
