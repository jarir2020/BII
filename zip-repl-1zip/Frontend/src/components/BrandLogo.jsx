import React from "react";

// 2026-08-25: replaced inline SVG with the new brand logo image (logo512.png).
export default function BrandLogo({ size = 44, className = "" }) {
  return (
    <img
      src="/logo512.png"
      width={size}
      height={size}
      alt="Bengali Islamic Institute Logo"
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
