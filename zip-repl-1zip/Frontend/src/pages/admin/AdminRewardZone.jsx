import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "../../contexts/LangContext";
import {
  Gift, Coins, PlayCircle, PlusCircle, PencilSimple, Trash,
  ToggleLeft, ToggleRight, SealPercent, ArrowRight, CheckCircle,
  Warning, X, FloppyDisk,
  Gear, FilmSlate, Sparkle, Eye, Link as LinkIcon,
  Money, Clock, CheckFat, XCircle,
} from "@phosphor-icons/react";
import { api, formatApiError } from "../../lib/api";
import { toast } from "sonner";

// ── Bengali numerals ──────────────────────────────────────────────────────────
const BN = (n) => String(Math.floor(n ?? 0)).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

function durationLabel(seconds) {
  const total = Math.max(1, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours) {
    const remainingMinutes = Math.floor((total % 3600) / 60);
    return remainingMinutes
      ? `${BN(hours)} ঘ. ${BN(remainingMinutes)} মি.`
      : `${BN(hours)} ঘ.`;
  }
  if (!minutes) return `${BN(total)} সে.`;
  if (!remainder) return `${BN(minutes)} মি.`;
  return `${BN(minutes)} মি. ${BN(remainder)} সে.`;
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input
        type="checkbox"
        className="sr-only"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`w-12 h-6 rounded-full transition-colors duration-200 ${
          checked ? "bg-[var(--bii-emerald)]" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block w-4 h-4 rounded-full bg-white shadow mt-1 transition-transform duration-200 ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </div>
    </label>
  );
}

function durationInputValue(value, unit) {
  if (value === "" || value === null || value === undefined) return "";
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  return unit === "minutes" ? String(seconds / 60) : String(Math.round(seconds));
}

function normalizeDurationInput(value) {
  return String(value).replace(/[০-৯]/g, (digit) => "০১২৩৪৫৬৭৮৯".indexOf(digit));
}

function DurationField({ value, onChange }) {
  const [unit, setUnit] = useState("seconds");
  const [draft, setDraft] = useState(() => durationInputValue(value, "seconds"));
  const lastEmittedValue = useRef(value);
  const multiplier = unit === "minutes" ? 60 : 1;

  useEffect(() => {
    // Parent state changes caused by this field should not replace the text
    // currently being entered (especially on mobile number keyboards). Only
    // sync when the value was changed from outside this component.
    if (value !== lastEmittedValue.current) {
      setDraft(durationInputValue(value, unit));
    }
    lastEmittedValue.current = value;
  }, [value, unit]);

  return (
    <div className="flex gap-2">
      <input
        className="bii-input min-w-0 flex-1"
        type="text"
        inputMode={unit === "minutes" ? "decimal" : "numeric"}
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === "") {
            lastEmittedValue.current = "";
            onChange("");
            return;
          }
          const next = Number(normalizeDurationInput(raw));
          if (Number.isFinite(next) && next > 0) {
            const nextValue = Math.round(next * multiplier);
            lastEmittedValue.current = nextValue;
            onChange(nextValue);
          }
        }}
      />
      <select
        className="bii-input w-28"
        value={unit}
        onChange={(e) => {
          const nextUnit = e.target.value;
          setUnit(nextUnit);
          setDraft(durationInputValue(value, nextUnit));
        }}
        aria-label="সময়ের একক"
      >
        <option value="seconds">সেকেন্ড</option>
        <option value="minutes">মিনিট</option>
      </select>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — Settings
// ══════════════════════════════════════════════════════════════════════════════
function SettingsTab() {
  const [form, setForm] = useState({
    coins_per_ad: 5,
    coins_per_taka: 10,
    min_cashout_coins: 100,
    coins_per_redeem: 50,
    promo_discount_type: "flat",
    promo_discount_value: 50,
    reward_zone_enabled: true,
    ad_watch_cooldown_seconds: 30,
    watch_duration_seconds: 15,
    max_ads_per_day: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/reward-settings")
      .then((r) => {
        if (r.data && Object.keys(r.data).length > 1)
          setForm((f) => ({ ...f, ...r.data }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/reward-settings", form);
      toast.success("✓ সফলভাবে সংরক্ষিত হয়েছে");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="py-10 text-center text-[var(--bii-text-soft)]">
        লোড হচ্ছে...
      </div>
    );

  const maxDayCoins = form.coins_per_ad * form.max_ads_per_day;
  const adsForRedeem = form.coins_per_redeem / (form.coins_per_ad || 1);
  const discLabel =
    form.promo_discount_type === "percent"
      ? `${form.promo_discount_value}%`
      : `৳${form.promo_discount_value}`;

  return (
    <div className="space-y-6">
      {/* On/Off */}
      <div className="bii-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-[var(--bii-text)]">
              ভিডিও দেখে ইনকাম চালু / বন্ধ
            </div>
            <div className="text-xs text-[var(--bii-text-soft)]">
              বন্ধ করলে হোম মেনু থেকে অপশনটি লুকানো থাকবে
            </div>
          </div>
          <Toggle
            checked={form.reward_zone_enabled}
            onChange={(v) => set("reward_zone_enabled", v)}
          />
        </div>
      </div>

      {/* Coin & Ad Settings */}
      <div className="bii-card p-5 space-y-5">
        <h3 className="font-semibold text-[var(--bii-text)] flex items-center gap-2">
          <Coins size={18} weight="fill" className="text-[var(--bii-gold)]" />{" "}
          কয়েন ও বিজ্ঞাপন সেটিংস
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              key: "coins_per_ad",
              label: "প্রতি ভিডিওতে কয়েন",
              hint: "একটি ভিডিও দেখলে কত কয়েন পাবে",
              min: 1,
            },
            {
              key: "ad_watch_cooldown_seconds",
              label: "কুলডাউন (সেকেন্ড)",
              hint: "দুটি ভিডিওর মাঝে বিরতি",
              min: 0,
            },
            {
              key: "watch_duration_seconds",
              label: "সর্বনিম্ন ভিডিও দেখার সময়",
              hint: "সেকেন্ড বা মিনিট বেছে দিন; স্টুডেন্টকে অন্তত এতক্ষণ দেখতে হবে",
            },
            {
              key: "max_ads_per_day",
              label: "দৈনিক সীমা (0 = অসীমিত)",
              hint: "0 দিলে কোনো সীমা থাকবে না",
              min: 0,
            },
            {
              key: "coins_per_taka",
              label: "কয়েনে এক টাকা",
              hint: "কত কয়েনে ১ টাকা হবে (ডিফল্ট: ১০)",
              min: 1,
            },
            {
              key: "min_cashout_coins",
              label: "সর্বনিম্ন ক্যাশআউট (কয়েন)",
              hint: "ক্যাশআউটের জন্য ন্যূনতম কয়েন",
              min: 1,
            },
            {
              key: "coins_per_redeem",
              label: "প্রমো কোডের জন্য কয়েন",
              hint: "প্রমো কোড পেতে কত কয়েন লাগবে",
              min: 1,
            },
          ].map(({ key, label, hint, min, max }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">
                {label}
              </label>
              {key === "watch_duration_seconds" ? (
                <DurationField
                  value={form[key]}
                  onChange={(value) => set(key, value)}
                />
              ) : (
                <input
                  className="bii-input"
                  type="number"
                  min={min}
                  max={max}
                  value={form[key]}
                  onChange={(e) =>
                    set(key, e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              )}
              <p className="text-xs text-[var(--bii-text-soft)] mt-1">
                {hint}
              </p>
            </div>
          ))}
        </div>

        {/* live summary */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-800 space-y-1">
          <p>
            🪙 {BN(form.coins_per_taka)} কয়েন = ৳১ &nbsp;|&nbsp;
            সর্বনিম্ন ক্যাশআউট: {BN(form.min_cashout_coins)} কয়েন = ৳{Math.floor(form.min_cashout_coins / (form.coins_per_taka || 1))}
          </p>
          <p>
            {form.max_ads_per_day === 0
              ? "♾️ কোনো দৈনিক সীমা নেই — যত খুশি ভিডিও দেখা যাবে"
              : `💡 দিনে সর্বোচ্চ ${BN(form.max_ads_per_day * form.coins_per_ad)} কয়েন (${BN(form.max_ads_per_day)}টি ভিডিও × ${BN(form.coins_per_ad)} কয়েন)`}
          </p>
        </div>
      </div>

      {/* Promo Discount */}
      <div className="bii-card p-5 space-y-4">
        <h3 className="font-semibold text-[var(--bii-text)] flex items-center gap-2">
          <SealPercent
            size={18}
            weight="fill"
            className="text-amber-500"
          />{" "}
          প্রমো কোড সেটিংস
        </h3>
        <p className="text-xs text-[var(--bii-text-soft)]">
          রিডিম করলে স্বয়ংক্রিয়ভাবে যে প্রমো কোড তৈরি হয় তার ডিসকাউন্ট কত
          হবে।
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">
              ডিসকাউন্ট ধরন
            </label>
            <select
              className="bii-input"
              value={form.promo_discount_type}
              onChange={(e) => set("promo_discount_type", e.target.value)}
            >
              <option value="flat">নির্দিষ্ট টাকা (৳)</option>
              <option value="percent">শতকরা (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--bii-text-soft)]">
              ডিসকাউন্ট পরিমাণ{" "}
              {form.promo_discount_type === "percent" ? "(%)" : "(৳)"}
            </label>
            <input
              className="bii-input"
              type="number"
              min="1"
              value={form.promo_discount_value}
              onChange={(e) =>
                set("promo_discount_value", parseFloat(e.target.value) || 1)
              }
            />
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          🎟️ {BN(form.coins_per_redeem)} কয়েন জমা করলে{" "}
          <strong>{discLabel}</strong> ডিসকাউন্ট কোড পাবে।
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="bii-btn-primary w-full py-3 flex items-center justify-center gap-2"
      >
        <FloppyDisk size={18} weight="fill" />
        {saving ? "সংরক্ষণ হচ্ছে..." : "সেটিংস সংরক্ষণ করুন"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Ad Management
// ══════════════════════════════════════════════════════════════════════════════

const BLANK_AD = {
  title: "",
  ad_type: "link",
  media_url: "",
  thumbnail_url: "",
  duration_seconds: 15,
  is_active: true,
  order: 0,
  description: "",
};

// ── Inline form ───────────────────────────────────────────────────────────────
function AdForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_AD,
    ...(initial || {}),
    duration_seconds: initial?.duration_seconds ?? BLANK_AD.duration_seconds,
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("বিজ্ঞাপনের শিরোনাম দিন");
      return;
    }
    if (!form.media_url.trim()) {
      toast.error("বিজ্ঞাপনের লিংক/URL দিন");
      return;
    }
    const durationSeconds = Number(form.duration_seconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      toast.error("সঠিক সেকেন্ডের পরিমাণ দিন");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        ad_type: "link",
        media_url: form.media_url.trim(),
        thumbnail_url: "",
        duration_seconds: Math.round(durationSeconds),
        is_active: !!form.is_active,
        order: Number(form.order) || 0,
        description: form.description.trim(),
      };
      await onSave(payload, form.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bii-card border-2 border-[var(--bii-emerald)]/30 p-5 space-y-4">
      <h4 className="font-semibold text-[var(--bii-text)] flex items-center gap-2">
        <FilmSlate size={18} weight="fill" className="text-[var(--bii-emerald)]" />
        {form.id ? "বিজ্ঞাপন সম্পাদনা করুন" : "নতুন বিজ্ঞাপন যোগ করুন"}
      </h4>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
          শিরোনাম <span className="text-red-500">*</span>
        </label>
        <input
          className="bii-input"
          placeholder="যেমন: ইসলামিক বই সেল ২০২৬"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>

      {/* Duration */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
          দেখার সময়
        </label>
        <DurationField
          value={form.duration_seconds}
          onChange={(value) => set("duration_seconds", value)}
        />
        <p className="text-[11px] text-[var(--bii-text-soft)] mt-1">
          ১ মিনিট = ৬০ সেকেন্ড
        </p>
      </div>

      {/* URL */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
          বিজ্ঞাপন লিংক (যেকোনো URL) {" "}
          <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <LinkIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bii-text-soft)]"
          />
          <input
            className="bii-input pl-8"
            placeholder="https://example.com/your-video-or-page"
            value={form.media_url}
            onChange={(e) => set("media_url", e.target.value)}
          />
        </div>
        <p className="mt-1 text-xs text-[var(--bii-text-soft)]">
          YouTube, সরাসরি ভিডিও, ওয়েবসাইট বা অ্যাকাউন্ট—যেকোনো লিংক দিন। স্টুডেন্ট
          “ভিডিও দেখুন” চাপলে লিংকটি ফুল স্ক্রিনে খুলবে।
        </p>
        {form.media_url.trim() && (
          <a
            href={form.media_url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--bii-emerald)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            <LinkIcon size={16} weight="bold" /> লিংকটি পূর্ণস্ক্রিনে খুলে দেখুন
          </a>
        )}
      </div>

      {/* Order + Active */}
      <div className="flex items-center gap-4">
        <div className="w-32">
          <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
            ক্রম নম্বর
          </label>
          <input
            className="bii-input"
            type="number"
            min="0"
            value={form.order}
            onChange={(e) =>
              set("order", parseInt(e.target.value) || 0)
            }
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Toggle
            checked={form.is_active}
            onChange={(v) => set("is_active", v)}
          />
          <span className="text-sm text-[var(--bii-text)]">
            {form.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
          নোট (ঐচ্ছিক)
        </label>
        <textarea
          className="bii-input resize-none"
          rows={2}
          placeholder="বিজ্ঞাপন সম্পর্কে নোট..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl border border-[var(--bii-border)] text-sm text-[var(--bii-text-soft)] hover:bg-gray-50 transition disabled:opacity-40"
        >
          বাতিল
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-[var(--bii-emerald)] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              সংরক্ষণ হচ্ছে...
            </>
          ) : (
            <>
              <FloppyDisk size={16} weight="fill" /> সংরক্ষণ করুন
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Ads Tab ───────────────────────────────────────────────────────────────────
function AdsTab() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | adObject
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/reward-ads");
      setAds(r.data || []);
    } catch (e) {
      toast.error("বিজ্ঞাপন লোড করা যায়নি: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Save (create or update)
  const saveAd = async (payload, id) => {
    try {
      if (id) {
        await api.put(`/admin/reward-ads/${id}`, payload);
        toast.success("✓ বিজ্ঞাপন আপডেট হয়েছে");
      } else {
        await api.post("/admin/reward-ads", payload);
        toast.success("✓ নতুন বিজ্ঞাপন যোগ হয়েছে");
      }
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
      throw e; // re-throw so AdForm can reset its saving state
    }
  };

  const toggleActive = async (ad) => {
    setToggling(ad.id);
    try {
      const payload = {
        title: ad.title,
        ad_type: "link",
        media_url: ad.media_url,
        thumbnail_url: "",
        duration_seconds: ad.duration_seconds,
        is_active: !ad.is_active,
        order: ad.order,
        description: ad.description || "",
      };
      await api.put(`/admin/reward-ads/${ad.id}`, payload);
      toast.success(
        ad.is_active ? "বিজ্ঞাপন বন্ধ করা হয়েছে" : "বিজ্ঞাপন চালু করা হয়েছে"
      );
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setToggling(null);
    }
  };

  const deleteAd = async (ad) => {
    if (!window.confirm(`"${ad.title}" — মুছে দিতে চান?`)) return;
    setDeleting(ad.id);
    try {
      await api.delete(`/admin/reward-ads/${ad.id}`);
      toast.success("বিজ্ঞাপন মুছে দেওয়া হয়েছে");
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDeleting(null);
    }
  };

  if (loading)
    return (
      <div className="py-10 text-center text-[var(--bii-text-soft)]">
        লোড হচ্ছে...
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-[var(--bii-text-soft)]">
            মোট{" "}
            <span className="font-semibold text-[var(--bii-text)]">
              {BN(ads.length)}টি
            </span>{" "}
            বিজ্ঞাপন —{" "}
            <span className="font-semibold text-[var(--bii-emerald)]">
              {BN(ads.filter((a) => a.is_active).length)}টি
            </span>{" "}
            সক্রিয়
          </p>
        </div>
        {editing === null && (
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bii-emerald)] text-white text-sm font-semibold hover:opacity-90 transition active:scale-95"
          >
            <PlusCircle size={18} weight="fill" /> নতুন বিজ্ঞাপন যোগ করুন
          </button>
        )}
      </div>

      {/* Form (new or edit) */}
      {editing !== null && (
        <AdForm
          initial={editing === "new" ? BLANK_AD : editing}
          onSave={saveAd}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Info — how to use */}
      {!loading && ads.length === 0 && editing === null && (
        <div className="bii-card p-8 text-center space-y-3">
          <FilmSlate
            size={52}
            className="mx-auto text-[var(--bii-text-soft)] opacity-30"
          />
          <p className="font-semibold text-[var(--bii-text)]">
            এখনও কোনো বিজ্ঞাপন নেই
          </p>
          <p className="text-sm text-[var(--bii-text-soft)] max-w-sm mx-auto">
            "নতুন বিজ্ঞাপন যোগ করুন" বাটনে ক্লিক করে শুধু বিজ্ঞাপনের লিংক দিন। লিংকটি
            YouTube, ওয়েবসাইট, অ্যাকাউন্ট বা সরাসরি ভিডিও—যেকোনো কিছু হতে পারে।
          </p>
          <button
            onClick={() => setEditing("new")}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bii-emerald)] text-white text-sm font-semibold hover:opacity-90 transition"
          >
            <PlusCircle size={18} weight="fill" /> প্রথম বিজ্ঞাপন যোগ করুন
          </button>
        </div>
      )}

      {/* Ads list */}
      <div className="space-y-3">
        {ads.map((ad) => {
          return (
            <div
              key={ad.id}
              className={`bii-card p-4 flex items-center gap-4 transition ${
                !ad.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Thumbnail / icon */}
              <div className="w-14 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-cyan-100 text-cyan-600">
                <LinkIcon size={20} weight="bold" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[var(--bii-text)] truncate">
                  {ad.title}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs text-[var(--bii-text-soft)] bg-gray-100 px-2 py-0.5 rounded-full">
                    বিজ্ঞাপন লিংক
                  </span>
                  <span className="text-xs text-[var(--bii-text-soft)] bg-gray-100 px-2 py-0.5 rounded-full">
                    ⏱ {durationLabel(ad.duration_seconds)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ad.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {ad.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </span>
                  {ad.order > 0 && (
                    <span className="text-xs text-[var(--bii-text-soft)] bg-gray-100 px-2 py-0.5 rounded-full">
                      ক্রম #{ad.order}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActive(ad)}
                  disabled={toggling === ad.id}
                  title={ad.is_active ? "বন্ধ করুন" : "চালু করুন"}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition text-[var(--bii-text-soft)] disabled:opacity-40"
                >
                  {ad.is_active ? (
                    <ToggleRight
                      size={22}
                      weight="fill"
                      className="text-[var(--bii-emerald)]"
                    />
                  ) : (
                    <ToggleLeft size={22} weight="fill" />
                  )}
                </button>
                <button
                  onClick={() => setEditing(ad)}
                  title="সম্পাদনা"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition text-[var(--bii-text-soft)]"
                >
                  <PencilSimple size={16} weight="fill" />
                </button>
                <button
                  onClick={() => deleteAd(ad)}
                  title="মুছুন"
                  disabled={deleting === ad.id}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition text-[var(--bii-text-soft)] disabled:opacity-40"
                >
                  <Trash size={16} weight="fill" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      {ads.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
          <Warning size={14} weight="fill" className="mt-0.5 flex-shrink-0" />
          <span>
            এখানে শুধু বিজ্ঞাপনের লিংক দিন। লিংকের ধরন আলাদা করে নির্বাচন করতে হবে না;
            স্টুডেন্ট “ভিডিও দেখুন” চাপলে পুরো লিংকটি ফুল স্ক্রিনে খুলবে। ক্রম নম্বর ছোট
            হলে আগে দেখাবে।
          </span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3 — Give Promo Code
// ══════════════════════════════════════════════════════════════════════════════
function GivePromoTab() {
  const [form, setForm] = useState({
    student_id: "",
    discount_type: "flat",
    discount_value: 50,
    note: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const send = async () => {
    if (!form.student_id.trim()) {
      toast.error("স্টুডেন্ট আইডি দিন");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const r = await api.post("/admin/reward-zone/give-promo", form);
      setResult(r.data);
      setForm((f) => ({ ...f, student_id: "", note: "" }));
      toast.success(`🎁 ${r.data.student_name} কে প্রমো কোড দেওয়া হয়েছে!`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex items-start gap-3">
        <Gift
          size={20}
          weight="fill"
          className="text-amber-500 flex-shrink-0 mt-0.5"
        />
        <span>
          এখান থেকে যেকোনো স্টুডেন্টকে ম্যানুয়ালি প্রমো কোড দিতে পারবেন।
          কোডটি শপে ব্যবহার করলে সরাসরি ডিসকাউন্ট পাবে।
        </span>
      </div>

      <div className="bii-card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
            স্টুডেন্ট আইডি{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            className="bii-input"
            placeholder="যেমন: BII-0001"
            value={form.student_id}
            onChange={(e) =>
              set("student_id", e.target.value.toUpperCase())
            }
          />
          <p className="text-xs text-[var(--bii-text-soft)] mt-1">
            স্টুডেন্টের প্রোফাইলে যে আইডি আছে সেটি দিন
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
              ডিসকাউন্ট ধরন
            </label>
            <select
              className="bii-input"
              value={form.discount_type}
              onChange={(e) => set("discount_type", e.target.value)}
            >
              <option value="flat">নির্দিষ্ট টাকা (৳)</option>
              <option value="percent">শতকরা (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
              পরিমাণ{" "}
              {form.discount_type === "percent" ? "(%)" : "(৳)"}
            </label>
            <input
              className="bii-input"
              type="number"
              min="1"
              value={form.discount_value}
              onChange={(e) =>
                set("discount_value", parseFloat(e.target.value) || 1)
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--bii-text-soft)]">
            নোট / কারণ (ঐচ্ছিক)
          </label>
          <input
            className="bii-input"
            placeholder="যেমন: কুইজ বিজয়ী পুরস্কার"
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm">
          <ArrowRight
            size={16}
            className="text-[var(--bii-emerald)] flex-shrink-0"
          />
          <span className="text-[var(--bii-text-soft)]">
            স্টুডেন্ট পাবে:{" "}
            <strong className="text-[var(--bii-text)]">
              {form.discount_type === "percent"
                ? `${form.discount_value}% ছাড়`
                : `৳${form.discount_value} ছাড়`}
            </strong>{" "}
            — ১ বার ব্যবহার করা যাবে
          </span>
        </div>

        <button
          onClick={send}
          disabled={sending || !form.student_id.trim()}
          className="w-full py-3 rounded-xl bg-[var(--bii-emerald)] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition active:scale-95"
        >
          {sending ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              পাঠানো হচ্ছে...
            </>
          ) : (
            <>
              <Gift size={18} weight="fill" /> প্রমো কোড দিন
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center space-y-3">
          <CheckCircle
            size={36}
            weight="fill"
            className="text-green-600 mx-auto"
          />
          <p className="font-semibold text-green-800">
            {result.student_name} ({result.student_id})-কে কোড দেওয়া হয়েছে!
          </p>
          <code className="font-mono text-xl font-bold text-[var(--bii-emerald)] bg-white px-4 py-2 rounded-xl border-2 border-emerald-200 tracking-widest block">
            {result.code}
          </code>
          <p className="text-xs text-green-600">
            ডিসকাউন্ট:{" "}
            {result.discount_type === "percent"
              ? `${result.discount_value}%`
              : `৳${result.discount_value}`}{" "}
            — শপে ব্যবহারযোগ্য
          </p>
          <button
            onClick={() => setResult(null)}
            className="text-xs text-[var(--bii-emerald)] underline"
          >
            আরও কোড দিন
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 4 — Cashout Requests
// ══════════════════════════════════════════════════════════════════════════════
const METHOD_LABEL = { bkash: "bKash 🟣", nagad: "Nagad 🟠", rocket: "Rocket 🔵" };

function StatusBadge({ status }) {
  const map = {
    pending:  { label: "অপেক্ষমাণ", cls: "bg-amber-100 text-amber-700" },
    approved: { label: "অনুমোদিত",  cls: "bg-green-100 text-green-700" },
    rejected: { label: "বাতিল",      cls: "bg-red-100 text-red-600"    },
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

function CashoutTab() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("pending");
  const [acting,   setActing]   = useState(null);
  const [noteMap,  setNoteMap]  = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/cashout-requests?status=${filter}`);
      setRequests(r.data || []);
    } catch (e) {
      toast.error("লোড করা যায়নি: " + formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (req) => {
    setActing(req.id + "-approve");
    try {
      await api.put(`/admin/cashout-requests/${req.id}/approve`, { note: noteMap[req.id] || "" });
      toast.success(`✓ ${req.user_name} কে ৳${req.taka_amount} অনুমোদন দেওয়া হয়েছে`);
      await load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setActing(null); }
  };

  const reject = async (req) => {
    if (!window.confirm(`${req.user_name}-এর ৳${req.taka_amount} রিকোয়েস্ট বাতিল করবেন? কয়েন ফেরত দেওয়া হবে।`)) return;
    setActing(req.id + "-reject");
    try {
      await api.put(`/admin/cashout-requests/${req.id}/reject`, { note: noteMap[req.id] || "" });
      toast.success("রিকোয়েস্ট বাতিল এবং কয়েন ফেরত দেওয়া হয়েছে");
      await load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setActing(null); }
  };

  const totalTaka = requests.reduce((s, r) => s + (r.taka_amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { v: "pending",  label: "অপেক্ষমাণ" },
          { v: "approved", label: "অনুমোদিত"  },
          { v: "rejected", label: "বাতিল"       },
          { v: "all",      label: "সবগুলো"      },
        ].map(({ v, label }) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === v ? "bg-white text-[var(--bii-emerald)] shadow-sm" : "text-[var(--bii-text-soft)]"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {requests.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          মোট <strong>{requests.length}টি</strong> রিকোয়েস্ট — মোট <strong>৳{totalTaka}</strong>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center text-[var(--bii-text-soft)]">
          <Money size={48} weight="duotone" className="mx-auto mb-3 opacity-30" />
          <p>কোনো রিকোয়েস্ট নেই</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bii-card p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-[var(--bii-text)]">{req.user_name}</div>
                  <div className="text-xs text-[var(--bii-text-soft)]">{req.user_email}</div>
                </div>
                <StatusBadge status={req.status} />
              </div>

              {/* Amount + method */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <div className="font-bold text-lg text-[var(--bii-emerald)]">৳{req.taka_amount}</div>
                  <div className="text-xs text-[var(--bii-text-soft)]">🪙 {BN(req.coins)} কয়েন</div>
                </div>
                <ArrowRight size={18} className="text-[var(--bii-text-soft)] flex-shrink-0" />
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <div className="font-semibold text-sm">{METHOD_LABEL[req.payment_method] || req.payment_method}</div>
                  <div className="font-mono text-xs text-[var(--bii-text-soft)]">{req.payment_number}</div>
                </div>
              </div>

              <div className="text-xs text-[var(--bii-text-soft)]">
                জমা: {req.created_at ? req.created_at.slice(0, 16).replace("T", " ") : ""}
              </div>

              {req.admin_note && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">📝 {req.admin_note}</div>
              )}

              {/* Note input + actions (only for pending) */}
              {req.status === "pending" && (
                <div className="space-y-2 pt-1">
                  <input
                    className="bii-input text-xs"
                    placeholder="নোট (ঐচ্ছিক) — অনুমোদন/বাতিলের কারণ"
                    value={noteMap[req.id] || ""}
                    onChange={(e) => setNoteMap((m) => ({ ...m, [req.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => approve(req)}
                      disabled={!!acting}
                      className="flex-1 py-2.5 rounded-xl bg-[var(--bii-emerald)] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 transition active:scale-95">
                      {acting === req.id + "-approve"
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />প্রসেস…</>
                        : <><CheckFat size={16} weight="fill" />অনুমোদন (৳{req.taka_amount} পাঠান)</>}
                    </button>
                    <button onClick={() => reject(req)}
                      disabled={!!acting}
                      className="px-4 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-40 transition active:scale-95 flex items-center gap-1.5">
                      {acting === req.id + "-reject"
                        ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <><XCircle size={16} weight="fill" />বাতিল</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab definitions
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "settings", label: "ইনকাম সেটিংস", icon: Gear       },
  { id: "cashout",  label: "ক্যাশআউট",     icon: Money      },
  { id: "ads",      label: "ভিডিও বিজ্ঞাপন", icon: FilmSlate  },
  { id: "promo",    label: "প্রমো কোড",     icon: SealPercent },
];

// ══════════════════════════════════════════════════════════════════════════════
// Main Export
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminRewardZone() {
  const { pick } = useLang();
  const [tab, setTab] = useState("cashout");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <Sparkle size={24} weight="fill" className="text-white" />
        </div>
        <div>
          <h2 className="font-heading text-2xl text-[var(--bii-emerald)]">
            {pick("ভিডিও দেখে ইনকাম করুন", "Watch Videos & Earnings")}
          </h2>
          <p className="text-sm text-[var(--bii-text-soft)] mt-0.5">
            ভিডিও প্রতি কয়েন, কয়েন-থেকে-টাকার হিসাব, বিজ্ঞাপন এবং ক্যাশআউট রিকোয়েস্ট এখান থেকেই পরিচালনা করুন।
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              tab === id
                ? "bg-white text-[var(--bii-emerald)] shadow-sm"
                : "text-[var(--bii-text-soft)] hover:text-[var(--bii-text)]"
            }`}>
            <Icon size={15} weight={tab === id ? "fill" : "regular"} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "settings" && <SettingsTab />}
      {tab === "cashout"  && <CashoutTab />}
      {tab === "ads"      && <AdsTab />}
      {tab === "promo"    && <GivePromoTab />}
    </div>
  );
}
