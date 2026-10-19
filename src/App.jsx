import { useMemo, useState } from "react";
import UploadZone from "./components/UploadZone.jsx";
import ItemGrid from "./components/ItemGrid.jsx";
import ChoreoPicker from "./components/ChoreoPicker.jsx";
import PreviewPane from "./components/PreviewPane.jsx";
import ExportBar from "./components/ExportBar.jsx";
import { decomposeLogo } from "./lib/segment.js";
import { buildLottie, layoutItems } from "./lib/lottie.js";
import { getChoreo } from "./lib/choreo.js";
import { SAMPLES, sampleFile } from "./lib/samples.js";

const FPS = 60;

export default function App() {
  const [decomp, setDecomp] = useState(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [choreoId, setChoreoId] = useState("rakit");
  const [params, setParams] = useState({ dur: 0.9, stagger: 0.12, hold: 0.8 });
  const [size, setSize] = useState(512);
  const [loop, setLoop] = useState(true);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setDecomp(null);
    try {
      const d = await decomposeLogo(file);
      setDecomp(d);
      setFileName(file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "logo");
    } catch {
      setError("Gagal membaca logo — coba file PNG/JPG/SVG lain.");
    } finally {
      setBusy(false);
    }
  };

  const lottieData = useMemo(() => {
    if (!decomp) return null;
    const choreo = getChoreo(choreoId);
    const layout = layoutItems(decomp.items, decomp.srcW, decomp.srcH, size);
    const { moves } = choreo.build(decomp.items, layout, {
      fps: FPS,
      size,
      staggerF: Math.round(params.stagger * FPS),
      moveF: Math.round(params.dur * FPS),
      holdSec: params.hold,
    });
    return buildLottie({ items: decomp.items, moves, size, fps: FPS, name: `${fileName}-${choreoId}` });
  }, [decomp, choreoId, params, size, fileName]);

  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-violet-500 flex items-center justify-center text-xl">🌀</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Logo<span className="text-teal-300">Motion</span> Studio
          </h1>
        </div>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
          Upload logo → otomatis dipecah per elemen → pilih koreografi kreatif → preview live → download <span className="text-teal-300 font-mono">.json</span> Lottie siap pakai.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-5 pb-16 space-y-5">
        <UploadZone onFile={handleFile} busy={busy} />

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Belum ada logo? Coba contoh:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              disabled={busy}
              onClick={() => handleFile(sampleFile(s))}
              className="px-3.5 py-1.5 rounded-full border border-violet-400/40 text-violet-300 text-xs font-semibold hover:bg-violet-400/10 transition-colors disabled:opacity-50"
            >
              ✨ {s.name}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {decomp && (
          <>
            <ItemGrid items={decomp.items} kind={decomp.kind} />
            <ChoreoPicker
              choreoId={choreoId}
              setChoreoId={setChoreoId}
              params={params}
              setParams={setParams}
              size={size}
              setSize={setSize}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PreviewPane data={lottieData} loop={loop} setLoop={setLoop} />
              <ExportBar data={lottieData} fileName={fileName} choreoName={choreoId} />
            </div>
          </>
        )}

        {!decomp && !busy && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              ["🧩", "Pecah otomatis", "SVG dipecah per elemen vektor. PNG/JPG dipecah per gumpalan bentuk via analisis piksel."],
              ["✨", "Koreografi kreatif", "5 template gerak — Rakit, Kaskade, Ledakan, Gelombang, Pusaran — disusun dari item logomu sendiri."],
              ["📦", "Export Lottie", "Satu file JSON valid, gambar ter-embed base64. Langsung jalan di web & aplikasi mobile."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="glow-card rounded-2xl p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold text-sm mb-1">{title}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600">
        LogoMotion Studio — ubah logo statis jadi animasi Lottie dalam sekali klik.
      </footer>
    </div>
  );
}
