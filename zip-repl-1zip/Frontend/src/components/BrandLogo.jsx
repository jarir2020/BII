import React from "react";

// Custom SVG logo: 8-point Islamic star with open book inside, emerald + gold.
export default function BrandLogo({ size = 44, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bengali Islamic Institute Logo"
    >
      <defs>
        <linearGradient id="bii-emerald" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#0D5739" />
          <stop offset="100%" stopColor="#0A422B" />
        </linearGradient>
      </defs>
      {/* 8-point star (two overlapping squares) */}
      <g transform="translate(32,32)">
        <rect x="-22" y="-22" width="44" height="44" rx="6" fill="url(#bii-emerald)" />
        <rect x="-22" y="-22" width="44" height="44" rx="6" fill="url(#bii-emerald)" transform="rotate(45)" />
        {/* gold thin star outline */}
        <rect x="-22" y="-22" width="44" height="44" rx="6" fill="none" stroke="#D4AF37" strokeWidth="1.3" transform="rotate(45)" opacity="0.9" />
        {/* open book glyph */}
        <g transform="translate(0,2)">
          <path d="M -14 -2 Q -7 -7 0 -3 Q 7 -7 14 -2 L 14 8 Q 7 4 0 8 Q -7 4 -14 8 Z"
                fill="#FDFCF9" />
          <path d="M 0 -3 L 0 8" stroke="#D4AF37" strokeWidth="1.2" />
        </g>
        {/* small crescent on top */}
        <path d="M -4 -12 a 5 5 0 1 0 5 5 a 4 4 0 1 1 -5 -5"
              fill="#D4AF37" opacity="0.95" />
      </g>
    </svg>
  );
}
