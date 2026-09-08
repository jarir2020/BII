import React, { useEffect, useRef } from "react";
import { useAds } from "../contexts/AdsContext";
import { hideAdMobBanner, showAdMobBanner } from "../lib/admob";
import AdsterraBanner from "./AdsterraBanner"; // 2026-08-24: Adsterra units take over listed slots on web

// 2026-08-24: slots that ALSO render an Adsterra unit above the AdSense one
// (footer-banner handled separately in BottomBanner)
const ADSTERRA_SLOT_MAP = {
  "courses-top": "in-content",
  "videos-top": "in-content",
  "shop-top": "in-content",
};

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

let adsenseScriptPromise = null;

function loadAdSenseScript(publisherId) {
  if (typeof document === "undefined") return Promise.resolve();

  // index.html owns the first-party script. Also recognize an already-added
  // script so route changes cannot create a second AdSense loader.
  const existing =
    document.getElementById("adsense-script") ||
    Array.from(document.scripts).find((script) =>
      script.src.startsWith("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")
    );
  if (existing) {
    existing.id = "adsense-script";
    return Promise.resolve();
  }

  if (adsenseScriptPromise) return adsenseScriptPromise;

  adsenseScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "adsense-script";
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("AdSense script failed to load"));
    document.head.appendChild(script);
  }).catch((error) => {
    adsenseScriptPromise = null;
    throw error;
  });

  return adsenseScriptPromise;
}

export default function AdBanner({ slot, format = "responsive", className = "" }) {
  const { platform, publisherId, admob, adUnits, slotEnabled, adsEnabled, isLoaded } = useAds();
  const adUnitId = adUnits[slot] || "";
  const insRef  = useRef(null);
  const pushed  = useRef(false);

  // Native Android/iOS uses the AdMob SDK. Keep one persistent bottom banner
  // owned by the layout footer instead of injecting web AdSense markup into a
  // native WebView.
  useEffect(() => {
    if (
      platform !== "app" ||
      slot !== "footer-banner" ||
      !admob?.bannerUnit ||
      !adsEnabled ||
      !isLoaded ||
      slotEnabled?.[slot] === false
    ) return undefined;

    showAdMobBanner(admob.bannerUnit).catch(() => {});
    return () => { hideAdMobBanner().catch(() => {}); };
  }, [admob?.bannerUnit, adsEnabled, isLoaded, platform, slot, slotEnabled]);

  useEffect(() => {
    if (
      platform !== "web" ||
      !publisherId ||
      !adUnitId ||
      !adsEnabled ||
      !isLoaded ||
      pushed.current
    ) return;
    if (!insRef.current) return;
    let cancelled = false;
    const run = async () => {
      try {
        await loadAdSenseScript(publisherId);
        if (cancelled) return;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch (_) {
        /* AdSense failed to load — keep the page functional */
      }
    };

    const schedule = () => {
      if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(run, { timeout: 1500 });
        return () => window.cancelIdleCallback?.(id);
      }
      const id = window.setTimeout(run, 1200);
      return () => window.clearTimeout(id);
    };

    const cleanup = schedule();
    return () => {
      cancelled = true;
      if (typeof cleanup === "function") cleanup();
    };
  }, [adUnitId, platform, publisherId, adsEnabled, isLoaded]);

  const adStyle  = FORMAT_STYLES[format] || FORMAT_STYLES.responsive;
  const phHeight = PLACEHOLDER_HEIGHTS[format] || 80;

  // Reserve fixed height even while ads are loading to prevent CLS when ad unit appears
  if (!isLoaded) {
    return (
      <div className={`overflow-hidden text-center my-3 ${className}`} style={{ minHeight: phHeight }} />
    );
  }

  // AdMob renders through the native SDK and must not render AdSense markup.
  if (platform === "app") return null;

  // Ads disabled globally — render nothing
  if (!adsEnabled) return null;

  // This specific slot disabled by admin — render nothing
  if (slotEnabled && slotEnabled[slot] === false) return null;

  /* ── No publisher ID yet → render nothing ── */
  if (!publisherId) return null;

  // A manual AdSense unit without a slot ID is invalid. Do not push a broken
  // <ins> element; the admin can enable it after configuring the slot.
  if (!adUnitId) return null;

  // 2026-08-24: Adsterra renders alongside AdSense on listed slots (both earn)
  const adsterra = (
    <AdsterraBanner slot={ADSTERRA_SLOT_MAP[slot] || slot} className="mb-2" />
  );



  /* ── Publisher ID present → real AdSense unit ── */
  return (
    <div className={`overflow-hidden text-center my-3 ${className}`}>
      {ADSTERRA_SLOT_MAP[slot] && adsterra}
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
