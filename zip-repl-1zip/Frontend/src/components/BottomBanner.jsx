import React from "react";
import AdBanner from "./AdBanner";
import { useAds } from "../contexts/AdsContext";

export default function BottomBanner({ slot, className = "" }) {
  const { slotEnabled, isLoaded } = useAds();

  if (!isLoaded) return null;
  if (slotEnabled?.[slot] === false) return null;

  return (
    <div
      className={`sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 ${className}`}
      style={{ marginBottom: -1, marginTop: 0 }}
    >
      <AdBanner slot={slot} format="horizontal" />
    </div>
  );
}

export function BottomPadding() {
  return "pb-16 sm:pb-24";
}
