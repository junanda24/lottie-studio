/**
 * segment.js — decompose an uploaded logo into its individual items.
 *
 * - SVG: each top-level element (path/group/shape) becomes an item by
 *   re-rendering it alone to a canvas.
 * - Raster (PNG/JPG): connected-component labeling on the foreground mask
 *   (alpha channel, or color-keyed background) → each blob becomes an item.
 *
 * Returns: { items: [{ png, w, h, ncx, ncy }], srcW, srcH, kind }
 *   png  = cropped PNG data URL of the item
 *   ncx/ncy = item centroid, normalized 0..1 in source coords (for choreography)
 */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img-load"));
    img.src = src;
  });
}

function canvasOf(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Crop a canvas to its non-transparent content. Null when empty. */
function extractContent(canvas, minArea = 40) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        sx += x; sy += y; n++;
      }
    }
  }
  if (n < minArea) return null;
  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = canvasOf(cw, ch);
  out.getContext("2d").drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return { canvas: out, w: cw, h: ch, ccx: sx / n, ccy: sy / n };
}

async function decomposeSVG(text) {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.namespaceURI !== "http://www.w3.org/2000/svg") throw new Error("not-svg");

  let vw = 1024, vh = 1024;
  const vb = root.getAttribute("viewBox");
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p[2] > 0 && p[3] > 0) { vw = p[2]; vh = p[3]; }
  } else {
    const w = parseFloat(root.getAttribute("width"));
    const h = parseFloat(root.getAttribute("height"));
    if (w > 0 && h > 0) { vw = w; vh = h; }
  }
  const scale = Math.min(1, 1024 / Math.max(vw, vh));
  const RW = Math.max(8, Math.round(vw * scale));
  const RH = Math.max(8, Math.round(vh * scale));

  const SKIP = new Set(["defs", "style", "title", "desc", "metadata"]);
  let kids = [...root.children].filter((el) => !SKIP.has(el.tagName));
  // A single wrapper group → go one level deeper for real items.
  if (kids.length === 1 && kids[0].tagName === "g") {
    const inner = [...kids[0].children].filter((el) => !SKIP.has(el.tagName));
    if (inner.length > 1) kids = inner;
  }
  if (kids.length === 0) throw new Error("empty-svg");

  const defs = root.querySelector(":scope > defs");
  const style = root.querySelector(":scope > style");
  const NS = "http://www.w3.org/2000/svg";
  const items = [];

  for (const kid of kids) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("xmlns", NS);
    s.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    s.setAttribute("width", String(RW));
    s.setAttribute("height", String(RH));
    if (defs) s.appendChild(defs.cloneNode(true));
    if (style) s.appendChild(style.cloneNode(true));
    s.appendChild(kid.cloneNode(true));
    const str = new XMLSerializer().serializeToString(s);
    const url = URL.createObjectURL(new Blob([str], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = await loadImage(url);
      const c = canvasOf(RW, RH);
      c.getContext("2d").drawImage(img, 0, 0, RW, RH);
      const ex = extractContent(c);
      if (ex) {
        items.push({
          png: ex.canvas.toDataURL("image/png"),
          w: ex.w, h: ex.h,
          ncx: ex.ccx / RW, ncy: ex.ccy / RH,
        });
      }
    } catch {
      /* skip unrenderable element */
    }
    URL.revokeObjectURL(url);
    if (items.length >= 14) break;
  }
  if (items.length === 0) throw new Error("empty-svg");
  return { items, srcW: RW, srcH: RH, kind: "svg" };
}

async function decomposeRaster(img) {
  const maxDim = 700;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const W = Math.max(8, Math.round(img.width * scale));
  const H = Math.max(8, Math.round(img.height * scale));
  const c = canvasOf(W, H);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;

  // --- foreground mask ---
  const mask = new Uint8Array(W * H);
  let hasAlpha = false;
  for (let i = 3; i < d.length; i += 160) {
    if (d[i] < 250) { hasAlpha = true; break; }
  }
  if (hasAlpha) {
    for (let i = 0; i < W * H; i++) mask[i] = d[i * 4 + 3] > 128 ? 1 : 0;
  } else {
    const key = (i) => `${d[i * 4] >> 5},${d[(i * 4 + 1)] >> 5},${d[(i * 4 + 2)] >> 5}`;
    const votes = {};
    const corner = (x0, y0) => {
      for (let y = y0; y < Math.min(H, y0 + 8); y++)
        for (let x = x0; x < Math.min(W, x0 + 8); x++) {
          const k = key(y * W + x);
          votes[k] = (votes[k] || 0) + 1;
        }
    };
    corner(0, 0); corner(W - 8, 0); corner(0, H - 8); corner(W - 8, H - 8);
    const bg = Object.entries(votes)
      .sort((a, b) => b[1] - a[1])[0][0]
      .split(",").map((v) => Number(v) * 32 + 16);
    for (let i = 0; i < W * H; i++) {
      const dr = d[i * 4] - bg[0];
      const dg = d[i * 4 + 1] - bg[1];
      const db = d[i * 4 + 2] - bg[2];
      mask[i] = dr * dr + dg * dg + db * db > 48 * 48 ? 1 : 0;
    }
  }

  // --- two-pass connected-component labeling (union-find) ---
  const labels = new Int32Array(W * H);
  const parent = [0];
  const find = (x) => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) { const nx = parent[x]; parent[x] = r; x = nx; }
    return r;
  };
  let next = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const left = x > 0 && mask[i - 1] ? labels[i - 1] : 0;
      const up = y > 0 && mask[i - W] ? labels[i - W] : 0;
      if (!left && !up) {
        parent[next] = next;
        labels[i] = next++;
      } else if (left && up && left !== up) {
        const a = find(left), b = find(up);
        const lo = Math.min(a, b), hi = Math.max(a, b);
        parent[hi] = lo;
        labels[i] = lo;
      } else {
        labels[i] = left || up;
      }
    }
  }
  const comps = new Map();
  for (let i = 0; i < W * H; i++) {
    if (!mask[i]) continue;
    const r = find(labels[i]);
    let cc = comps.get(r);
    if (!cc) {
      cc = { x0: W, y0: H, x1: -1, y1: -1, n: 0, sx: 0, sy: 0 };
      comps.set(r, cc);
    }
    const x = i % W, y = (i / W) | 0;
    if (x < cc.x0) cc.x0 = x;
    if (x > cc.x1) cc.x1 = x;
    if (y < cc.y0) cc.y0 = y;
    if (y > cc.y1) cc.y1 = y;
    cc.n++; cc.sx += x; cc.sy += y;
  }

  const minArea = W * H * 0.0012;
  const list = [...comps.values()]
    .filter((cc) => cc.n > minArea)
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);

  const items = [];
  for (const cc of list) {
    const pad = 3;
    const x0 = Math.max(0, cc.x0 - pad);
    const y0 = Math.max(0, cc.y0 - pad);
    const x1 = Math.min(W - 1, cc.x1 + pad);
    const y1 = Math.min(H - 1, cc.y1 + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const sub = ctx.getImageData(x0, y0, cw, ch);
    const sd = sub.data;
    for (let yy = 0; yy < ch; yy++) {
      for (let xx = 0; xx < cw; xx++) {
        if (!mask[(y0 + yy) * W + (x0 + xx)]) sd[(yy * cw + xx) * 4 + 3] = 0;
      }
    }
    const out = canvasOf(cw, ch);
    out.getContext("2d").putImageData(sub, 0, 0);
    items.push({
      png: out.toDataURL("image/png"),
      w: cw, h: ch,
      ncx: cc.sx / cc.n / W,
      ncy: cc.sy / cc.n / H,
    });
  }
  if (items.length === 0) throw new Error("no-foreground");
  return { items, srcW: W, srcH: H, kind: "raster" };
}

export async function decomposeLogo(file) {
  const looksSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (looksSvg) {
    const text = await file.text();
    try {
      return await decomposeSVG(text);
    } catch {
      /* fall through to raster handling */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return await decomposeRaster(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}
