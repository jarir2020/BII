import React, { useMemo } from "react";

/**
 * AdsterraBanner — renders an Adsterra iframe banner unit.
 *
 * 2026-08-24: Created for Adsterra integration (web-only; app keeps AdMob).
 * Uses an isolated <iframe srcDoc> so the invoke.js document.write
 * cannot clobber the host page.
 *
 * Props:
 *   width, height — banner dimensions (default 728x90)
 */

// TODO: move keys into backend ads config (ConfigsController) so they can be
// rotated without redeploy. For now hardcode per slot here.
const UNITS = {
  "footer-banner": {
    key: "24e06a03b1c582237d96cf02c695f10a",
    width: 728,
    height: 90,
  },
  // 2026-08-24: mobile variant served on narrow viewports
  "footer-banner-mobile": {
    key: "972fb788b3a759ebf4a2e4a3ef0a38fd",
    width: 320,
    height: 50,
  },
};

export default function AdsterraBanner({ slot = "footer-banner", className = "" }) {
  const unit = UNITS[slot];

  const srcDoc = useMemo(() => {
    if (!unit) return "";
    return `<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body>
<script type="text/javascript">
	atOptions = {
		'key' : '${unit.key}',
		'format' : 'iframe',
		'height' : ${unit.height},
		'width' : ${unit.width},
		'params' : {}
	};
</script>
<script type="text/javascript" src="https://www.highrevenueformat.com/${unit.key}/invoke.js"></script>
</body></html>`;
  }, [unit]);

  if (!unit || !srcDoc) return null;

  // Scale down on narrow screens while preserving aspect ratio
  return (
    <div className={`w-full flex justify-center overflow-hidden ${className}`}>
      <div
        style={{
          width: unit.width,
          maxWidth: "100%",
          aspectRatio: `${unit.width} / ${unit.height}`,
          position: "relative",
        }}
      >
        <iframe
          title={`adsterra-${slot}`}
          srcDoc={srcDoc}
          scrolling="no"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          style={{
            border: 0,
            position: "absolute",
            top: 0,
            left: 0,
            width: unit.width,
            height: unit.height,
            transformOrigin: "top left",
            transform: "scale(var(--ad-scale, 1))",
          }}
          onLoad={(e) => {
            const wrap = e.currentTarget.parentElement;
            const scale = Math.min(1, wrap.clientWidth / unit.width);
            e.currentTarget.style.setProperty("--ad-scale", scale);
          }}
        />
      </div>
    </div>
  );
}
