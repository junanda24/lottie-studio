import { useState } from "react";
import { downloadJson } from "../lib/lottie.js";

export default function ExportBar({ data, fileName, choreoName }) {
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const json = JSON.stringify(data);
  const kb = (new Blob([json]).size / 1024).toFixed(1);
  const frames = data.op - data.ip;
  const dur = (frames / data.fr).toFixed(2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="glow-card rounded-2xl p-5">
      <h2 className="font-semibold text-teal-200 mb-3">📦 Export Lottie JSON</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-center">
        {[
          [`${data.layers.length}`, "layer"],
          [`${frames} fr`, `${dur} dtk`],
          [`${data.w}×${data.h}`, "canvas"],
          [`${kb} KB`, "ukuran file"],
        ].map(([a, b]) => (
          <div key={b} className="rounded-xl bg-slate-900/70 border border-slate-700/60 py-2.5">
            <div className="font-mono text-sm text-teal-300">{a}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{b}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={() => downloadJson(data, `${fileName || "logo"}-${choreoName || "anim"}.json`)}
          className="btn-primary flex-1 py-3 rounded-xl bg-teal-400 text-slate-950 text-sm font-bold hover:bg-teal-300 transition-colors"
        >
          ⬇️ Download .json
        </button>
        <button
          onClick={copy}
          className="px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          {copied ? "✅ Tersalin!" : "📋 Copy JSON"}
        </button>
      </div>
      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        File valid untuk lottie-web / LottieFiles / After Effects (via Bodymovin). Gambar logo ter-embed base64 — satu file, tanpa aset eksternal.
      </p>
    </div>
  );
}
