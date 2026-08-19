export const C = {
  ink:      "#0A1512",
  deep:     "#0E211A",
  panel:    "#12291F",
  brand:    "#16C078",
  brandDim: "#0C8552",
  cream:    "#F2F7F4",
  muted:    "#8AA79A",
  line:     "rgba(242,247,244,.12)",
  usdc:     "#2775CA",
  no:       "#E5484D",
};

/** The Yield Goblin mark. Hood hugs the skull and ears tuck behind it, so the
 *  silhouette reads as a hooded goblin rather than a face wearing headphones. */
export const GOBLIN = (size) => `
<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#93E4A0"/><stop offset="100%" stop-color="#43A85F"/>
    </linearGradient>
    <linearGradient id="ear" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7FD68E"/><stop offset="100%" stop-color="#3C9A56"/>
    </linearGradient>
    <linearGradient id="hood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E6B41"/><stop offset="100%" stop-color="#0B3E24"/>
    </linearGradient>
  </defs>
  <!-- hood: thick band sharing the skull's centre, so there is no gap -->
  <path d="M6.6 27.5A17.4 17.4 0 0 1 41.4 27.5L36.3 27.5A12.3 12.3 0 0 0 11.7 27.5Z" fill="url(#hood)"/>
  <!-- ears tuck under the skull -->
  <path d="M13.5 21.2 3.4 16.4a1 1 0 0 0-1.4 1.3l4.2 9.6 7.3 2.4Z" fill="url(#ear)"/>
  <path d="M34.5 21.2 44.6 16.4a1 1 0 0 1 1.4 1.3l-4.2 9.6-7.3 2.4Z" fill="url(#ear)"/>
  <!-- skull -->
  <ellipse cx="24" cy="27.5" rx="12.3" ry="13" fill="url(#skin)"/>
  <ellipse cx="19.4" cy="26.4" rx="3.1" ry="3.5" fill="#fff"/>
  <ellipse cx="28.6" cy="26.4" rx="3.1" ry="3.5" fill="#fff"/>
  <circle cx="20" cy="26.8" r="1.75" fill="#12301E"/>
  <circle cx="29.2" cy="26.8" r="1.75" fill="#12301E"/>
  <path d="M23.3 29.6h1.4c.5 0 .8.5.6 1l-.7 1.3a.7.7 0 0 1-1.2 0l-.7-1.3c-.2-.5.1-1 .6-1Z" fill="#2E7A48" opacity=".6"/>
  <path d="M18.4 33.4c1.6 1.9 3.5 2.9 5.6 2.9s4-1 5.6-2.9c-1 3.5-3.2 5.4-5.6 5.4s-4.6-1.9-5.6-5.4Z" fill="#12301E" opacity=".9"/>
  <path d="M20.8 34.5h1.9l-.4 2.2Z" fill="#fff"/>
  <path d="M25.9 34.5h1.9l-.4 2.2Z" fill="#fff"/>
</svg>`;

export const FONT = `-apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif`;

export const base = (w, h, body, extraCss = "") => `<!doctype html><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${w}px;height:${h}px;overflow:hidden}
  body{font-family:${FONT};background:${C.ink};color:${C.cream};
       -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  .glow{position:absolute;border-radius:50%;filter:blur(90px);opacity:.5;pointer-events:none}
  .chip{display:inline-flex;align-items:center;gap:9px;border:1px solid ${C.line};
        border-radius:999px;padding:9px 18px;font-size:19px;font-weight:500;color:${C.cream}}
  .dot{width:9px;height:9px;border-radius:50%;display:inline-block}
  ${extraCss}
</style>
<body>${body}</body>`;
