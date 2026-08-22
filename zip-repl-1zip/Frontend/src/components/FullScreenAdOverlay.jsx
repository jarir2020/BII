import React, { useEffect, useRef, useState } from "react";

/**
 * FullScreenAdOverlay — full-screen video/image ad for interstitial use cases.
 *
 * Used for:
 *   - Payment success full-screen ad (mobile only)
 *   - Library first-click ad
 *
 * Props:
 *   ad            — reward_ad object from backend (required)
 *   onComplete    — callback when ad is skipped/closed/timed out (required)
 *   title         — overlay title (default: "বিজ্ঞাপন")
 *   skipLabel     — skip button label (default: "বাদ দিন")
 *   countdown     — show countdown timer (default: true)
 *   minDuration   — minimum seconds before skip allowed (default: 3)
 *   className     — extra classes
 *
 * ad shape: { ad_type, media_url, thumbnail_url, duration_seconds, title }
 * ad_type values: 'youtube' | 'video' | 'image' | 'link'
 */

function youtubeEmbedUrl(url) {
  const value = String(url || "").trim();
  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match
    ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&rel=0`
    : value;
}

function adLink(url) {
  const value = String(url || "").trim();
  if (!value) return "#";
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://${value}`;
}

export default function FullScreenAdOverlay({
  ad,
  onComplete,
  title = "বিজ্ঞাপন",
  skipLabel = "বাদ দিন",
  countdown = true,
  minDuration = 3,
  className = "",
}) {
  const [elapsed, setElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

  const duration = Math.max(1, Number(ad?.duration_seconds) || 15);
  const adType = ad?.ad_type || "video";
  const mediaUrl = ad?.media_url || "";
  const youtubeSrc = youtubeEmbedUrl(mediaUrl);
  const isYoutube = youtubeSrc !== mediaUrl;
  const isDirectVideo = adType === "video" || /\.(mp4|webm|ogg)(?:[?#]|$)/i.test(mediaUrl);
  const isImage = adType === "image" || /\.(jpe?g|png|gif|webp|svg)(?:[?#]|$)/i.test(mediaUrl);

  useEffect(() => {
    startRef.current = Date.now();
    let completionTimeout;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(elapsed);
      if (elapsed >= minDuration) setCanSkip(true);
      if (elapsed >= duration) {
        clearInterval(timerRef.current);
        setFinished(true);
        setCanSkip(true);
        completionTimeout = setTimeout(onComplete, 500);
      }
    }, 500);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(completionTimeout);
    };
  }, [duration, minDuration, onComplete]);

  const handleSkip = () => {
    clearInterval(timerRef.current);
    onComplete();
  };

  const remaining = Math.max(0, duration - elapsed);
  const progress = Math.min(100, (elapsed / duration) * 100);

  if (!ad) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center ${className}`}
      role="dialog"
      aria-label={title}
    >
      {/* Video/Image content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {(adType === "youtube" || isYoutube) && mediaUrl && (
          <iframe
            src={youtubeSrc}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            title={title}
          />
        )}
        {isDirectVideo && mediaUrl && !isYoutube && (
          <video
            src={mediaUrl}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        )}
        {isImage && mediaUrl && !isYoutube && !isDirectVideo && (
          <img
            src={mediaUrl}
            alt={title}
            className="w-full h-full object-contain"
          />
        )}
        {adType === "link" && mediaUrl && !isYoutube && !isDirectVideo && !isImage && (
          <div className="relative h-full w-full">
            <iframe
              src={adLink(mediaUrl)}
              className="h-full w-full border-0"
              title={title}
              allow="fullscreen"
              allowFullScreen
            />
            <a
              href={adLink(mediaUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg"
            >
              লিংকটি পূর্ণস্ক্রিনে খুলুন ↗
            </a>
          </div>
        )}
      </div>

      {/* Overlay controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm font-medium">{title}</span>
          {countdown && (
            <span className="text-white/70 text-xs">
              {finished ? "সম্পন্ন" : `শেষ ${remaining}সে`}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-1 mb-3">
          <div
            className="bg-[var(--bii-gold)] h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={!canSkip}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
            canSkip
              ? "bg-white text-black hover:bg-gray-100"
              : "bg-white/20 text-white/50 cursor-not-allowed"
          }`}
        >
          {canSkip ? skipLabel : `${skipLabel} (${remaining}s)`}
        </button>
      </div>
    </div>
  );
}
