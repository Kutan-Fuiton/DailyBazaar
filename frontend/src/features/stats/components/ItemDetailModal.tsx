import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { statsApi, type ItemFullStats } from "../../../shared/api/stats";

const LIME = "#c3f400";
const SURFACE_CARD = "#161b0c";
const BORDER_COLOR = "rgba(195, 244, 0, 0.22)";

interface ItemDetailModalProps {
  itemId: number | null;
  onClose: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function PriceLineChart({ points }: { points: { date: string; price: number }[] }) {
  if (!points || points.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-[#8e9379]">
        Not enough price entries for trend graph yet.
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 360, H = 100, padX = 20, padY = 16;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (W - padX * 2);
    const y = H - padY - ((p.price - min) / range) * (H - padY * 2);
    return { x, y, price: p.price, date: p.date };
  });

  const polylinePts = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
        {/* Fill area */}
        <polygon
          points={`${padX},${H - padY} ${polylinePts} ${coords[coords.length - 1].x},${H - padY}`}
          fill="rgba(195,244,0,0.08)"
        />
        {/* Stroke line */}
        <polyline
          points={polylinePts}
          fill="none"
          stroke={LIME}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Circles */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="3.5"
            fill="#111508"
            stroke={LIME}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-[#8e9379] px-2 mt-1 font-mono">
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function ItemDetailModal({ itemId, onClose }: ItemDetailModalProps) {
  const [details, setDetails] = useState<ItemFullStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await statsApi.itemDetails(itemId!);
        if (!cancelled) setDetails(data);
      } catch (err) {
        console.error("Failed to load item details:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [itemId]);

  if (!itemId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="glass-card w-full max-w-lg p-6 rounded-3xl relative overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
          style={{
            background: SURFACE_CARD,
            border: `1px solid ${BORDER_COLOR}`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-xl text-[#8e9379] hover:text-[#e2e4cf] hover:bg-white/5 transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          {loading || !details ? (
            <div className="py-16 text-center text-xs text-[#8e9379] flex flex-col items-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-[#c3f400]/20 border-t-[#c3f400] animate-spin" />
              <span>Fetching item intelligence & market prices…</span>
            </div>
          ) : (
            <div className="overflow-y-auto pr-1">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-4xl">{details.emoji || "🥬"}</span>
                <div>
                  <h2
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#e2e4cf",
                    }}
                  >
                    {details.name}
                  </h2>
                  <p style={{ fontSize: "12px", color: "#8e9379" }}>
                    {details.bengali_name ? `${details.bengali_name} · ` : ""}
                    {details.hindi_name ? `${details.hindi_name} · ` : ""}
                    {details.category || "Groceries"}
                  </p>
                </div>
              </div>

              {/* Stats highlights */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                  <p className="text-[10px] text-[#8e9379] uppercase font-semibold">Avg Rate</p>
                  <p className="text-base font-bold font-mono text-[#c3f400] mt-0.5">
                    {details.avg_price ? `₹${Math.round(details.avg_price)}` : "—"}
                  </p>
                  <p className="text-[9px] text-[#8e9379]">per {details.unit || "kg"}</p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                  <p className="text-[10px] text-[#8e9379] uppercase font-semibold">Purchases</p>
                  <p className="text-base font-bold font-mono text-[#e2e4cf] mt-0.5">
                    {details.purchase_count}x
                  </p>
                  <p className="text-[9px] text-[#8e9379]">hauls logged</p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                  <p className="text-[10px] text-[#8e9379] uppercase font-semibold">Total Spend</p>
                  <p className="text-base font-bold font-mono text-[#00dce5] mt-0.5">
                    ₹{fmt(details.total_spent)}
                  </p>
                  <p className="text-[9px] text-[#8e9379]">all-time</p>
                </div>
              </div>

              {/* Price Trend Chart */}
              <div className="mb-5 p-4 rounded-2xl bg-black/30 border border-white/5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8e9379] mb-2">
                  30-Day Rate Trend
                </p>
                <PriceLineChart points={details.price_history} />
              </div>

              {/* Location Comparison Table */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8e9379] mb-2">
                  🗺️ Location Price Comparison
                </p>
                {details.locations.length === 0 ? (
                  <p className="text-xs text-[#8e9379]">
                    No vendor location comparisons recorded for this item yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {details.locations.map((loc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/5 text-xs"
                      >
                        <span className="font-medium text-[#e2e4cf]">{loc.location}</span>
                        <span className="font-mono font-bold text-[#c3f400]">₹{Math.round(loc.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
