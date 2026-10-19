/**
 * lottie.js — build a valid Lottie JSON document from decomposed logo items
 * plus per-item motion keyframes produced by choreo.js.
 *
 * The logo image data is embedded as base64 PNG assets, one image layer per
 * item, each animated through transform keyframes (opacity/rotation/
 * position/scale). lottie-web renders this directly — the in-app preview
 * IS the validation.
 */

// CSS cubic-bezier → Lottie keyframe handles (o = out of prev kf, i = into next kf)
export const EASE = {
  out: { o: [0.215, 0.61], i: [0.355, 1] },        // easeOutCubic
  outBack: { o: [0.34, 1.56], i: [0.64, 1] },      // easeOutBack (overshoot)
  outExpo: { o: [0.16, 1], i: [0.3, 1] },          // easeOutExpo
  inOut: { o: [0.645, 0.045], i: [0.355, 1] },     // easeInOutCubic
  in: { o: [0.55, 0.055], i: [0.675, 0.19] },       // easeInCubic (jatuhan)
  snap: { o: [0.85, 0], i: [0.15, 1] },            // snappy
};

/** One keyframe. s = number or array of numbers (always stored as array — lottie-web reads s.length/s[i]).
 *  Every keyframe ALWAYS carries i/o easing (lottie-web crashes reading keyData.o.x when missing).
 *  Default easing is linear: control points on y=x → identity curve. */
const LINEAR = { o: [0.25, 0.25], i: [0.75, 0.75] };

export function kf(t, s, ease = LINEAR) {
  const arr = Array.isArray(s) ? s : [s];
  const dims = arr.length;
  const k = { t: Math.round(t), s: arr };
  k.i = { x: Array(dims).fill(ease.i[0]), y: Array(dims).fill(ease.i[1]) };
  k.o = { x: Array(dims).fill(ease.o[0]), y: Array(dims).fill(ease.o[1]) };
  return k;
}

/**
 * Fit the source logo rect into a square canvas (contain).
 * Returns per-item final center in canvas coords: { fx, fy, fscale }
 */
export function layoutItems(items, srcW, srcH, size) {
  const fit = Math.min(size / srcW, size / srcH);
  const ox = (size - srcW * fit) / 2;
  const oy = (size - srcH * fit) / 2;
  return items.map((it) => ({
    fx: ox + it.ncx * srcW * fit,
    fy: oy + it.ncy * srcH * fit,
    fscale: fit * 100, // Lottie scale is in percent
  }));
}

/**
 * moves: array per item of { o:[], r:[], p:[], s:[] } keyframe lists.
 */
export function buildLottie({ items, moves, size = 512, fps = 60, name = "logo-animation" }) {
  let total = 1;
  for (const m of moves)
    for (const prop of ["o", "r", "p", "s"])
      for (const k of m[prop] || []) total = Math.max(total, k.t + 1);

  return {
    v: "5.7.4",
    fr: fps,
    ip: 0,
    op: total,
    w: size,
    h: size,
    nm: name,
    ddd: 0,
    assets: items.map((it, i) => ({
      id: `img_${i}`,
      w: it.w,
      h: it.h,
      u: "",
      p: it.png, // embedded base64 PNG
      e: 1, // embedded → lottie-web memakai `p` apa adanya (tanpa prepend path)
    })),
    layers: items.map((it, i) => ({
      ddd: 0,
      ind: i + 1,
      ty: 2,
      nm: `item_${i + 1}`,
      refId: `img_${i}`,
      sr: 1,
      ks: {
        o: { a: 1, k: moves[i].o },
        r: { a: 1, k: moves[i].r },
        p: { a: 1, k: moves[i].p },
        a: { a: 0, k: [it.w / 2, it.h / 2, 0] },
        s: { a: 1, k: moves[i].s },
      },
      ao: 0,
      ip: 0,
      op: total,
      st: 0,
      bm: 0,
    })),
    markers: [],
  };
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
