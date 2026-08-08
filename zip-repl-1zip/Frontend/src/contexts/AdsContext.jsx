import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

/**
 * AdsContext — loads AdSense/AdMob configuration once and makes it available
 * to all AdBanner components. Injects the AdSense script tag when a publisher
 * ID is present.
 */

const AdsContext = createContext({
  publisherId: "",
  adUnits: {},
  slotEnabled: {},
  adsEnabled: false,
  isLoaded: false,
});

export function AdsProvider({ children }) {
  const [cfg, setCfg] = useState({
    publisherId: "",
    adUnits: {},
    slotEnabled: {},
    adsEnabled: false,
    isLoaded: false,
  });

  useEffect(() => {
    api
      .get("/configs/ads")
      .then((r) => {
        const d = r.data || {};
        const publisherId = d.adsense_publisher_id || "";
        const adsEnabled = !!(d.ads_enabled && publisherId);

        // Inject AdSense script only once when publisher ID is configured
        if (publisherId && !document.getElementById("adsense-script")) {
          const script = document.createElement("script");
          script.id = "adsense-script";
          script.async = true;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
          script.crossOrigin = "anonymous";
          document.head.appendChild(script);
        }

        // Per-slot enabled flags — default true so old configs still show ads
        const slotEnabled = {
          "header-banner":    d.ad_slot_header_enabled          !== false,
          "in-content":       d.ad_slot_in_content_enabled      !== false,
          "footer-banner":    d.ad_slot_footer_enabled          !== false,
          "sidebar":          d.ad_slot_sidebar_enabled         !== false,
          "shop-top":         d.ad_slot_shop_enabled            !== false,
          "courses-top":      d.ad_slot_courses_enabled         !== false,
          "videos-top":       d.ad_slot_videos_enabled          !== false,
          "home-mid":         d.ad_slot_home_enabled            !== false,
          // Micro-slots
          "payment-form":       d.ad_slot_payment_form_enabled       !== false,
          "payment-success":    d.ad_slot_payment_success_enabled    !== false,
          "quiz-result":        d.ad_slot_quiz_result_enabled        !== false,
          "post-bottom":        d.ad_slot_post_bottom_enabled        !== false,
          "lesson-between":     d.ad_slot_lesson_between_enabled     !== false,
          "quiz-interstitial":  d.ad_slot_quiz_interstitial_enabled  !== false,
          "reward-zone":        d.ad_slot_reward_zone_enabled        !== false,
          "library-top":       d.ad_slot_library_enabled            !== false,
        };

        setCfg({
          publisherId,
          adsEnabled,
          adUnits: {
            "header-banner":   d.ad_unit_header          || "",
            "in-content":      d.ad_unit_in_content      || "",
            "footer-banner":   d.ad_unit_footer          || "",
            "sidebar":         d.ad_unit_sidebar         || "",
            "shop-top":        d.ad_unit_shop            || "",
            "courses-top":     d.ad_unit_courses         || "",
            "videos-top":      d.ad_unit_videos          || "",
            "home-mid":        d.ad_unit_home            || "",
            "payment-form":      d.ad_unit_payment_form      || "",
            "payment-success":   d.ad_unit_payment_success   || "",
            "quiz-result":       d.ad_unit_quiz_result       || "",
            "post-bottom":       d.ad_unit_post_bottom       || "",
            "lesson-between":    d.ad_unit_lesson_between    || "",
            "quiz-interstitial": d.ad_unit_quiz_interstitial || "",
            "reward-zone":       d.ad_unit_reward_zone       || "",
            "library-top":      d.ad_unit_library           || "",
          },
          slotEnabled,
          isLoaded: true,
        });
      })
      .catch(() => {
        setCfg((prev) => ({ ...prev, isLoaded: true }));
      });
  }, []);

  return <AdsContext.Provider value={cfg}>{children}</AdsContext.Provider>;
}

export function useAds() {
  return useContext(AdsContext);
}
