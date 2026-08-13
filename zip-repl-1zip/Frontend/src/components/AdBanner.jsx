import React, { useEffect, useRef } from "react";
import { useAds } from "../contexts/AdsContext";

/**
 * AdBanner — drop-in Google AdSense unit.
 *
 * Props:
 *   slot      — logical slot name matching AdsContext.adUnits key
 *               e.g. "header-banner" | "in-content" | "footer-banner" |
 *                    "courses-top" | "videos-top" | "shop-top" | "home-mid"
 *   format    — "responsive" (default) | "horizontal" | "rectangle" | "banner"
 *   className — extra CSS classes on the wrapper
 *
 * When publisher_id is configured:
 *   → renders real <ins class="adsbygoogle"> tag
 * When not yet configured:
 *   → renders a branded placeholder so you can see ad positions
 * When ads_enabled=false:
 *   → renders nothing
 */

const FORMAT_STYLES = {
  responsive:  { display: "block",                                    },
  horizontal:  { display: "inline-block", width: "728px", height: "90px"  },
  leaderboard: { display: "inline-block", width: "728px", height: "90px"  },
  rectangle:   { display: "inline-block", width: "300px", height: "250px" },
  "large-rect":{ display: "inline-block", width: "336px", height: "280px" },
  banner:      { display: "inline-block", width: "468px", height: "60px"  },
};

const PLACEHOLDER_HEIGHTS = {
  responsive:   80,
  horizontal:   90,
  leaderboard:  90,
  rectangle:   250,
  "large-rect":280,
  banner:       60,
};

export default function AdBanner({ slot, format = "responsive", className = "" }) {
  const { publisherId, adUnits, slotEnabled, adsEnabled, isLoaded } = useAds();
  const insRef  = useRef(null);
  const pushed  = useRef(false);

  useEffect(() => {
    if (!publisherId || !adsEnabled || !isLoaded || pushed.current) return;
    if (!insRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (_) { /* AdSense not yet loaded — will retry on next render */ }
  }, [publisherId, adsEnabled, isLoaded]);

  // Reserve fixed height even while ads are loading to prevent CLS when ad unit appears
  if (!isLoaded) {
    return (
      <div className={`overflow-hidden text-center my-3 ${className}`} style={{ minHeight: phHeight }}>
        <div className="h-full w-full" />
      </div>
    );
  }

  // Ads disabled globally — render nothing
  if (!adsEnabled) return null;

  // This specific slot disabled by admin — render nothing
  if (slotEnabled && slotEnabled[slot] === false) return null;

  const adUnitId = adUnits[slot] || "";
  const adStyle  = FORMAT_STYLES[format] || FORMAT_STYLES.responsive;
  const phHeight = PLACEHOLDER_HEIGHTS[format] || 80;

  /* ── No publisher ID yet → branded placeholder ── */
  if (!publisherId) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-[var(--bii-gold)]/40 bg-[var(--bii-cream)] text-[var(--bii-text-soft)] text-xs select-none my-3 ${className}`}
        style={{ minHeight: phHeight, width: "100%" }}
        aria-hidden="true"
      >
        <div className="text-center px-4 py-2 space-y-0.5">
          <div className="text-[var(--bii-emerald)] font-semibold text-[11px] uppercase tracking-widest">
            বিজ্ঞাপন এখানে দেখাবে
          </div>
          <div className="opacity-50 text-[10px]">
            slot: {slot} · format: {format}
          </div>
          <div className="opacity-50 text-[10px]">
            Admin → বিজ্ঞাপন সেটিংস → Publisher ID দিন
          </div>
        </div>
      </div>
    );
  }

  /* ── Publisher ID present → real AdSense unit ── */
  return (
    <div className={`overflow-hidden text-center my-3 ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={adStyle}
        data-ad-client={publisherId}
        data-ad-slot={adUnitId || undefined}
        data-ad-format={format === "responsive" ? "auto" : undefined}
        data-full-width-responsive={format === "responsive" ? "true" : undefined}
      />
    </div>
  );
}
