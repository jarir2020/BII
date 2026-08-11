import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

/**
 * AdsContext — loads platform-aware AdSense configuration.
 *
 * Detects whether running in Capacitor native app or web browser,
 * then loads the appropriate publisher ID and slot config.
 *
 * Platform-specific fields:
 *   - publisher_web / publisher_app
 *   - enabled_web / enabled_app
 *   - slots (per-page enable/disable map with {web, app} toggles)
 */

const AdsContext = createContext({
  platform: "web", // "web" | "app"
  publisherId: "",
  adUnits: {},
  slotEnabled: {},
  adsEnabled: false,
  isLoaded: false,
  rewardAds: [],
  loadRewardAds: async () => {},
});

export function AdsProvider({ children }) {
  const [cfg, setCfg] = useState({
    platform: "web",
    publisherId: "",
    adUnits: {},
    slotEnabled: {},
    adsEnabled: false,
    isLoaded: false,
    rewardAds: [],
  });

  useEffect(() => {
    // Detect platform
    const isNative =
      typeof window !== "undefined" &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform
        ? window.Capacitor.isNativePlatform()
        : false;
    const platform = isNative ? "app" : "web";

    // Fetch from ads-web (public, no auth) — falls back to ads if needed
    api
      .get("/configs/ads-web")
      .catch(() => api.get("/configs/ads").catch(() => ({})))
      .then((r) => {
        const d = r.data || {};

        // Use platform-specific publisher ID (with fallback to web)
        const publisherId =
          d[`publisher_${platform}`] ||
          d[`adsense_publisher_${platform}`] ||
          d.publisher_web ||
          d.adsense_publisher_web ||
          "";

        // Use platform-specific enabled flag
        const adsEnabled =
          !!(d[`enabled_${platform}`] || d[`ads_enabled_${platform}`]) &&
          !!publisherId;

        // Inject AdSense script only once when publisher ID is configured
        if (publisherId && !document.getElementById("adsense-script")) {
          const script = document.createElement("script");
          script.id = "adsense-script";
          script.async = true;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
          script.crossOrigin = "anonymous";
          document.head.appendChild(script);
        }

        // Build per-slot enabled flags from nested {web, app} structure
        // Falls back to old flat format for backwards compatibility
        const rawSlots = d.slots || {};
        const slotEnabled = {
          "header-banner":
            rawSlots["header-banner"]?.[platform] !== false &&
            d.ad_slot_header_enabled !== false,
          "in-content":
            rawSlots["in-content"]?.[platform] !== false &&
            d.ad_slot_in_content_enabled !== false,
          "footer-banner":
            rawSlots["footer-banner"]?.[platform] !== false &&
            d.ad_slot_footer_enabled !== false,
          sidebar:
            rawSlots.sidebar?.[platform] !== false &&
            d.ad_slot_sidebar_enabled !== false,
          "shop-top":
            rawSlots["shop-top"]?.[platform] !== false &&
            d.ad_slot_shop_enabled !== false,
          "shop-bottom":
            rawSlots["shop-bottom"]?.[platform] !== false,
          "courses-top":
            rawSlots["courses-top"]?.[platform] !== false &&
            d.ad_slot_courses_enabled !== false,
          "courses-bottom":
            rawSlots["courses-bottom"]?.[platform] !== false,
          "my-courses-bottom":
            rawSlots["my-courses-bottom"]?.[platform] !== false,
          "live-classes-bottom":
            rawSlots["live-classes-bottom"]?.[platform] !== false,
          "videos-top":
            rawSlots["videos-top"]?.[platform] !== false &&
            d.ad_slot_videos_enabled !== false,
          "videos-bottom":
            rawSlots["videos-bottom"]?.[platform] !== false,
          "home-mid":
            rawSlots["home-mid"]?.[platform] !== false &&
            d.ad_slot_home_enabled !== false,
          "payment-form":
            rawSlots["payment-form"]?.[platform] !== false &&
            d.ad_slot_payment_form_enabled !== false,
          "payment-success":
            rawSlots["payment-success"]?.[platform] !== false &&
            d.ad_slot_payment_success_enabled !== false,
          "quiz-result":
            rawSlots["quiz-result"]?.[platform] !== false &&
            d.ad_slot_quiz_result_enabled !== false,
          "quiz-bottom":
            rawSlots["quiz-bottom"]?.[platform] !== false,
          "post-bottom":
            rawSlots["post-bottom"]?.[platform] !== false &&
            d.ad_slot_post_bottom_enabled !== false,
          "lesson-between":
            rawSlots["lesson-between"]?.[platform] !== false &&
            d.ad_slot_lesson_between_enabled !== false,
          "quiz-interstitial":
            rawSlots["quiz-interstitial"]?.[platform] !== false &&
            d.ad_slot_quiz_interstitial_enabled !== false,
          "reward-zone":
            rawSlots["reward-zone"]?.[platform] !== false &&
            d.ad_slot_reward_zone_enabled !== false,
          "reward-zone-bottom":
            rawSlots["reward-zone-bottom"]?.[platform] !== false,
          "library-top":
            rawSlots["library-top"]?.[platform] !== false &&
            d.ad_slot_library_enabled !== false,
          "contact-bottom":
            rawSlots["contact-bottom"]?.[platform] !== false,
          "notifications-bottom":
            rawSlots["notifications-bottom"]?.[platform] !== false,
          "complaints-bottom":
            rawSlots["complaints-bottom"]?.[platform] !== false,
          "home-bottom":
            rawSlots["home-bottom"]?.[platform] !== false &&
            d.ad_slot_home_enabled !== false,
          "course-details-bottom":
            rawSlots["course-details-bottom"]?.[platform] !== false &&
            d.ad_slot_in_content_enabled !== false,
          "my-course-detail-bottom":
            rawSlots["my-course-detail-bottom"]?.[platform] !== false &&
            d.ad_slot_lesson_between_enabled !== false,
          "library-bottom":
            rawSlots["library-bottom"]?.[platform] !== false &&
            d.ad_slot_library_enabled !== false,
          "payment-bottom":
            rawSlots["payment-bottom"]?.[platform] !== false &&
            d.ad_slot_payment_form_enabled !== false,
          "payment-success-bottom":
            rawSlots["payment-success-bottom"]?.[platform] !== false &&
            d.ad_slot_payment_success_enabled !== false,
        };

        // Build ad unit map (AdSense slot IDs per slot)
        const adUnits = {
          "header-banner": d.ad_unit_header || "",
          "in-content": d.ad_unit_in_content || "",
          "footer-banner": d.ad_unit_footer || "",
          sidebar: d.ad_unit_sidebar || "",
          "shop-top": d.ad_unit_shop || "",
          "shop-bottom": d.ad_unit_shop_bottom || "",
          "courses-top": d.ad_unit_courses || "",
          "courses-bottom": d.ad_unit_courses_bottom || "",
          "my-courses-bottom": d.ad_unit_my_courses_bottom || "",
          "live-classes-bottom": d.ad_unit_live_classes_bottom || "",
          "videos-top": d.ad_unit_videos || "",
          "videos-bottom": d.ad_unit_videos_bottom || "",
          "home-mid": d.ad_unit_home || "",
          "payment-form": d.ad_unit_payment_form || "",
          "payment-success": d.ad_unit_payment_success || "",
          "quiz-result": d.ad_unit_quiz_result || "",
          "quiz-bottom": d.ad_unit_quiz_bottom || "",
          "post-bottom": d.ad_unit_post_bottom || "",
          "lesson-between": d.ad_unit_lesson_between || "",
          "quiz-interstitial": d.ad_unit_quiz_interstitial || "",
          "reward-zone": d.ad_unit_reward_zone || "",
          "reward-zone-bottom": d.ad_unit_reward_zone_bottom || "",
          "library-top": d.ad_unit_library || "",
          "contact-bottom": d.ad_unit_contact_bottom || "",
          "notifications-bottom": d.ad_unit_notifications_bottom || "",
          "complaints-bottom": d.ad_unit_complaints_bottom || "",
          "home-bottom": d.ad_unit_home_bottom || "",
          "course-details-bottom": d.ad_unit_in_content || "",
          "my-course-detail-bottom": d.ad_unit_lesson_between || "",
          "library-bottom": d.ad_unit_library || "",
          "payment-bottom": d.ad_unit_payment_form || "",
          "payment-success-bottom": d.ad_unit_payment_success || "",
        };

        setCfg({
          platform,
          publisherId,
          adsEnabled,
          adUnits,
          slotEnabled,
          isLoaded: true,
        });
      })
      .catch(() => {
        setCfg((prev) => ({ ...prev, isLoaded: true }));
      });
  }, []);

  const loadRewardAds = async (plat) => {
    const p = plat || cfg.platform || "web";
    try {
      const r = await api.get(`/rewards/ads?platform=${p}`);
      const ads = Array.isArray(r.data) ? r.data : [];
      setCfg((prev) => ({ ...prev, rewardAds: ads }));
      return ads;
    } catch {
      return [];
    }
  };

  return <AdsContext.Provider value={{ ...cfg, loadRewardAds }}>{children}</AdsContext.Provider>;
}

export function useAds() {
  return useContext(AdsContext);
}
