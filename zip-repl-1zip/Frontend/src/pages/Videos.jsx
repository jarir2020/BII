import React, { useEffect, useState } from "react";
import { X, YoutubeLogo, ArrowSquareOut, Play } from "@phosphor-icons/react";
import { useLang } from "../contexts/LangContext";
import { api, imgUrl } from "../lib/api";
import AdBanner from "../components/AdBanner";
import BottomBanner from "../components/BottomBanner";

/* ── YouTube helpers ── */
function getYtId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function toEmbed(url) {
  const id = getYtId(url);
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  return url; // direct video file
}

function ytThumb(url) {
  const id = getYtId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function isYoutube(url) { return !!getYtId(url); }

export default function Videos() {
  const { t, pick } = useLang();
  const [vids, setVids]   = useState([]);
  const [open, setOpen]   = useState(null);

  useEffect(() => {
    api.get("/videos").then((r) => setVids(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const close = () => setOpen(null);

  return (
    <div data-testid="videos-page" className="pb-16 sm:pb-24">
      <h1 className="font-heading text-3xl text-[var(--bii-emerald)] mb-4">{t("menuVideos")}</h1>
      <AdBanner slot="videos-top" format="responsive" className="mb-4" />

      {vids.length === 0 && (
        <div className="bii-card p-10 text-center text-[var(--bii-text-soft)]">
          <YoutubeLogo size={48} className="mx-auto mb-3 text-red-500 opacity-50" />
          <p>{pick("কোনো ভিডিও নেই", "No videos yet")}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vids.map((v) => {
          const thumb  = v.thumbnail ? imgUrl(v.thumbnail) : ytThumb(v.video_url);
          const isYt   = isYoutube(v.video_url);

          return (
            <button
              key={v.id}
              onClick={() => setOpen(v)}
              data-testid={`video-card-${v.id}`}
              className="bii-card overflow-hidden text-left group hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-900 relative overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={v.title_bn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--bii-emerald)]/10">
                    <YoutubeLogo size={48} className="text-red-500 opacity-60" />
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-xl">
                    <Play size={26} weight="fill" className="text-white ml-1" />
                  </div>
                </div>

                {/* YouTube badge */}
                {isYt && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                    <YoutubeLogo size={12} weight="fill" className="text-red-500" /> YouTube
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-heading text-base text-[var(--bii-emerald)] line-clamp-2 leading-snug">
                  {pick(v.title_bn, v.title_en)}
                </h3>
                {v.description && (
                  <p className="text-xs text-[var(--bii-text-soft)] mt-1.5 line-clamp-2">{v.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Lightbox Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3"
          onClick={close}
        >
          <div
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video */}
            <div className="aspect-video w-full rounded-t-2xl overflow-hidden bg-black">
              {isYoutube(open.video_url) ? (
                <iframe
                  className="w-full h-full"
                  src={toEmbed(open.video_url)}
                  title={open.title_bn}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  className="w-full h-full"
                  src={open.video_url}
                  controls
                  autoPlay
                />
              )}
            </div>

            {/* Footer bar */}
            <div className="bg-white rounded-b-2xl px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-heading text-lg text-[var(--bii-emerald)] leading-snug">
                  {pick(open.title_bn, open.title_en)}
                </h3>
                {open.description && (
                  <p className="text-xs text-[var(--bii-text-soft)] mt-1">{open.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isYoutube(open.video_url) && (
                  <a
                    href={open.video_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
                  >
                    <YoutubeLogo size={16} weight="fill" />
                    {t("watchOnYouTube")}
                    <ArrowSquareOut size={13} />
                  </a>
                )}
                <button
                  onClick={close}
                  className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
                  title={t("close")}
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <BottomBanner slot="videos-bottom" />
    </div>
  );
}
