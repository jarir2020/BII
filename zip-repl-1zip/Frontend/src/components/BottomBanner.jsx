import React from "react";
import AdBanner from "./AdBanner";
import AdsterraBanner from "./AdsterraBanner"; // 2026-08-24: Adsterra web fallback
import { useAds } from "../contexts/AdsContext";

const ADSTERRA_ENABLED = true; // 2026-08-24: set false to revert to AdSense-only

export default function BottomBanner({ slot, className = "" }) {
  const { slotEnabled, isLoaded } = useAds();

  if (!isLoaded) return null;
  if (slotEnabled?.[slot] === false) return null;

  return (
    <div
      className={`sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 ${className}`}
      style={{ marginBottom: -1, marginTop: 0 }}
    >
      {/* 2026-08-24: Adsterra on web (footer-banner slot), AdSense otherwise */}
      {ADSTERRA_ENABLED && slot === "footer-banner" ? (
        <>
          <div className="hidden sm:block">
            <AdsterraBanner slot="footer-banner" className="py-1" />
          </div>
          <div className="sm:hidden">
            <AdsterraBanner slot="footer-banner-mobile" className="py-1" />
          </div>
        </>
      ) : (
        <AdBanner slot={slot} format="horizontal" />
      )}
    </div>
  );
}

export function BottomPadding() {
  return "pb-16 sm:pb-24";
}
