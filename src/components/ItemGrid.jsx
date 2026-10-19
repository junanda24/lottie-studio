export default function ItemGrid({ items, kind }) {
  if (!items?.length) return null;
  return (
    <div className="glow-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-teal-200">
          🧩 Hasil pecahan — {items.length} item
        </h2>
        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {kind === "svg" ? "SVG · per elemen vektor" : "Raster · per gumpalan bentuk"}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {items.map((it, i) => (
          <div key={i} className="relative group">
            <div className="checker rounded-xl border border-slate-700/60 aspect-square flex items-center justify-center p-2 overflow-hidden">
              <img
                src={it.png}
                alt={`item ${i + 1}`}
                className="max-w-full max-h-full object-contain"
                style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.35))" }}
                draggable={false}
              />
            </div>
            <div className="absolute top-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-teal-300 border border-teal-500/30">
              #{i + 1}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Tiap item di atas jadi satu layer di file Lottie — beranimasi dengan timing-nya sendiri.
      </p>
    </div>
  );
}
