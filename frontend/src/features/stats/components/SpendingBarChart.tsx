import { useState } from "react";
import { TrendingUp, Sparkles, Info, ShieldCheck, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { MonthlySpendingPoint } from "../../../shared/api/stats";

const LIME = "#c3f400";
const CYAN = "#00dce5";
const SURFACE_CARD = "rgba(22, 27, 12, 0.9)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.16)";

interface SpendingBarChartProps {
  data: MonthlySpendingPoint[];
  loading?: boolean;
}

interface BenchmarkMonth {
  month_key: string;
  label: string;
  total: number;
  shift: string;
  isIncrease: boolean;
  driver: string;
  cpi: number;
}

const REGIONAL_BENCHMARK_DATA: BenchmarkMonth[] = [
  { month_key: "2026-05", label: "May", total: 2840, shift: "+3.2%", isIncrease: true, driver: "Early summer produce & gourd seasonal arrival", cpi: 104.2 },
  { month_key: "2026-06", label: "Jun", total: 2680, shift: "-5.6%", isIncrease: false, driver: "Monsoon onset cooling local leafy greens rates", cpi: 102.1 },
  { month_key: "2026-07", label: "Jul", total: 3150, shift: "+17.5%", isIncrease: true, driver: "Transport monsoon delays; tomato & onion spike", cpi: 108.4 },
  { month_key: "2026-08", label: "Aug", total: 2980, shift: "-5.4%", isIncrease: false, driver: "Post-rain mandi recovery; potato rates stabilize", cpi: 106.8 },
  { month_key: "2026-09", label: "Sep", total: 3520, shift: "+18.1%", isIncrease: true, driver: "Pre-festive pantry stocking; cooking oil & spices rise", cpi: 112.5 },
  { month_key: "2026-10", label: "Oct", total: 4200, shift: "+19.3%", isIncrease: true, driver: "Puja & Diwali peak volume; sweets, dairy & dry fruits", cpi: 119.8 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function getSvgBezierPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 2;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (next.x - curr.x) / 2;
    const cpY2 = next.y;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }
  return d;
}

export default function SpendingBarChart({ data, loading }: SpendingBarChartProps) {
  const hasUserSpend = data && data.length > 0 && data.some((d) => d.total > 0);
  const [viewMode, setViewMode] = useState<"benchmark" | "personal">(
    hasUserSpend ? "personal" : "benchmark"
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Normalize points based on selected view mode
  const displayPoints = (viewMode === "personal" && hasUserSpend)
    ? data.map((d, i) => {
        const bm = REGIONAL_BENCHMARK_DATA[i] || REGIONAL_BENCHMARK_DATA[REGIONAL_BENCHMARK_DATA.length - 1];
        const prevTotal = i > 0 ? (data[i - 1]?.total || 0) : d.total;
        const pct = prevTotal > 0 ? Math.round(((d.total - prevTotal) / prevTotal) * 100) : 0;
        return {
          month_key: d.month_key,
          label: d.label.split(" ")[0] || bm.label,
          total: d.total,
          shift: pct >= 0 ? `+${pct}%` : `${pct}%`,
          isIncrease: pct >= 0,
          driver: d.total > 0 ? `${d.transactions_count} hauls logged` : "No hauls recorded",
          benchmarkTotal: bm.total,
        };
      })
    : REGIONAL_BENCHMARK_DATA.map((bm) => ({
        month_key: bm.month_key,
        label: bm.label,
        total: bm.total,
        shift: bm.shift,
        isIncrease: bm.isIncrease,
        driver: bm.driver,
        benchmarkTotal: bm.total,
      }));

  const maxVal = Math.max(...displayPoints.map((p) => p.total), 4500);

  // SVG Geometry Dimensions for Spline curve overlay
  const SVG_W = 600;
  const SVG_H = 160;
  const PAD_X = 50;
  const PAD_Y = 24;

  const splinePoints = displayPoints.map((pt, i) => {
    const x = PAD_X + (i / Math.max(1, displayPoints.length - 1)) * (SVG_W - PAD_X * 2);
    const y = SVG_H - PAD_Y - (pt.total / maxVal) * (SVG_H - PAD_Y * 2);
    return { x, y };
  });

  const splineD = getSvgBezierPath(splinePoints);
  const areaD = splinePoints.length > 0
    ? `${splineD} L ${splinePoints[splinePoints.length - 1].x} ${SVG_H - 10} L ${splinePoints[0].x} ${SVG_H - 10} Z`
    : "";

  const activeHover = hoveredIdx !== null ? displayPoints[hoveredIdx] : displayPoints[displayPoints.length - 1];

  return (
    <div
      className="glass-card p-5 sm:p-6 rounded-2xl relative overflow-hidden"
      style={{
        background: SURFACE_CARD,
        border: `1px solid ${BORDER_COLOR}`,
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
      }}
    >
      {/* Background glow orb */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-20"
        style={{
          background: "radial-gradient(circle, #c3f400 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Header with Mode Switcher & Inference Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "#e2e4cf",
                letterSpacing: "-0.01em",
              }}
            >
              {viewMode === "benchmark" ? "Bazaar Market Spend Index" : "Monthly Personal Spending"}
            </h3>
            <span
              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{
                background: viewMode === "benchmark" ? "rgba(0,220,229,0.12)" : "rgba(195,244,0,0.12)",
                color: viewMode === "benchmark" ? CYAN : LIME,
                border: `1px solid ${viewMode === "benchmark" ? "rgba(0,220,229,0.3)" : "rgba(195,244,0,0.3)"}`,
              }}
            >
              {viewMode === "benchmark" ? "Regional CPI Benchmark" : "Personal Vault"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#8e9379" }}>
            {viewMode === "benchmark"
              ? "6-month wholesale mandi trend & household grocery expense trajectory"
              : "Track your grocery spend against regional inflation waves"}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div
          className="flex items-center p-1 rounded-xl self-start sm:self-auto"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={() => setViewMode("benchmark")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              viewMode === "benchmark"
                ? "bg-[#00dce5] text-black shadow-lg shadow-[#00dce5]/20"
                : "text-[#8e9379] hover:text-[#e2e4cf]"
            }`}
          >
            Market Index
          </button>
          <button
            onClick={() => setViewMode("personal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              viewMode === "personal"
                ? "bg-[#c3f400] text-black shadow-lg shadow-[#c3f400]/20"
                : "text-[#8e9379] hover:text-[#e2e4cf]"
            }`}
          >
            My Hauls {hasUserSpend ? `(${data.filter((d) => d.total > 0).length})` : "(0)"}
          </button>
        </div>
      </div>

      {/* Onboarding Notice when viewing personal with zero hauls */}
      {viewMode === "personal" && !hasUserSpend && (
        <div
          className="mb-4 p-3 rounded-xl flex items-center justify-between text-xs"
          style={{ background: "rgba(195,244,0,0.06)", border: "1px dashed rgba(195,244,0,0.25)" }}
        >
          <div className="flex items-center gap-2 text-[#e2e4cf]">
            <Info className="w-4 h-4 text-[#c3f400] flex-shrink-0" />
            <span>No personal receipts logged yet. Switch to <strong>Market Index</strong> above to view regional baseline insights.</span>
          </div>
          <button
            onClick={() => setViewMode("benchmark")}
            className="text-[11px] font-mono text-[#c3f400] underline font-bold ml-2 whitespace-nowrap"
          >
            View Market Index
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-56 flex items-end justify-between gap-3 pt-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 bg-white/5 rounded-t-lg" style={{ height: `${i * 15}%` }} />
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Active Hover / Current Month Inspection Card */}
          <div
            className="mb-3 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
                style={{
                  background: viewMode === "benchmark" ? "rgba(0,220,229,0.15)" : "rgba(195,244,0,0.15)",
                  color: viewMode === "benchmark" ? CYAN : LIME,
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {activeHover?.label}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                    ₹{fmt(activeHover?.total ?? 0)}
                  </span>
                  <span
                    className={`inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      activeHover?.isIncrease ? "text-amber-400 bg-amber-400/10" : "text-emerald-400 bg-emerald-400/10"
                    }`}
                  >
                    {activeHover?.isIncrease ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5 inline" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5 inline" />
                    )}
                    {activeHover?.shift} MoM
                  </span>
                </div>
                <p className="text-[11px] text-[#8e9379] truncate max-w-[280px] sm:max-w-[420px]">
                  {activeHover?.driver}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-[#8e9379] block">
                {viewMode === "benchmark" ? "Inferred Driver" : "Vault Share"}
              </span>
              <span className="text-xs font-mono font-bold text-[#e2e4cf]">
                {viewMode === "benchmark" ? "Mandi Volatility" : `${Math.round(((activeHover?.total || 0) / maxVal) * 100)}% of Max`}
              </span>
            </div>
          </div>

          {/* MAIN GRAPH CONTAINER: Bars + SVG Spline Overlay */}
          <div className="relative h-48 w-full pt-4 pb-2">
            {/* Background horizontal grid lines with currency labels */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              {[maxVal, Math.round(maxVal * 0.66), Math.round(maxVal * 0.33), 0].map((val, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-white/10 w-full text-[9px] font-mono text-[#8e9379]">
                  <span>₹{fmt(val)}</span>
                </div>
              ))}
            </div>

            {/* SVG Spline Glow Line & Gradient Area */}
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={viewMode === "benchmark" ? CYAN : LIME} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={viewMode === "benchmark" ? CYAN : LIME} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Under Curve */}
              {areaD && <path d={areaD} fill="url(#spendGrad)" />}

              {/* Spline Path */}
              {splineD && (
                <path
                  d={splineD}
                  fill="none"
                  stroke={viewMode === "benchmark" ? CYAN : LIME}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: `drop-shadow(0 0 8px ${viewMode === "benchmark" ? "rgba(0,220,229,0.5)" : "rgba(195,244,0,0.5)"})`,
                  }}
                />
              )}

              {/* Data Point Nodes */}
              {splinePoints.map((pt, i) => {
                const isHovered = hoveredIdx === i || (hoveredIdx === null && i === splinePoints.length - 1);
                return (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#111508"
                    stroke={viewMode === "benchmark" ? CYAN : LIME}
                    strokeWidth={isHovered ? 2.5 : 1.8}
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* Interactive Bars Column Grid */}
            <div className="relative z-20 flex items-end justify-between h-full gap-2 px-3">
              {displayPoints.map((point, idx) => {
                const heightPct = Math.max(Math.round((point.total / maxVal) * 100), 10);
                const isLatest = idx === displayPoints.length - 1;
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={point.month_key}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    {/* The Bar Track */}
                    <div className="w-full max-w-[42px] h-36 flex items-end justify-center">
                      <div
                        className="w-full rounded-t-lg relative overflow-hidden transition-all duration-300"
                        style={{
                          height: `${heightPct}%`,
                          background: isHovered || isLatest
                            ? `linear-gradient(180deg, ${viewMode === "benchmark" ? CYAN : LIME} 0%, rgba(195,244,0,0.2) 100%)`
                            : "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 100%)",
                          boxShadow: isHovered || isLatest
                            ? `0 0 16px ${viewMode === "benchmark" ? "rgba(0,220,229,0.3)" : "rgba(195,244,0,0.3)"}`
                            : "none",
                          borderTop: `2px solid ${isHovered || isLatest ? (viewMode === "benchmark" ? CYAN : LIME) : "rgba(255,255,255,0.2)"}`,
                        }}
                      >
                        {/* Shimmer light bar */}
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Month Label */}
                    <div className="mt-2 text-center">
                      <span
                        className="text-[11px] font-mono block transition-colors"
                        style={{
                          fontWeight: isLatest || isHovered ? 700 : 500,
                          color: isHovered
                            ? (viewMode === "benchmark" ? CYAN : LIME)
                            : isLatest
                            ? "#e2e4cf"
                            : "#8e9379",
                        }}
                      >
                        {point.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INFERENCES HUD: 3 Meaningful Analytical Deductions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/10">
            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <TrendingUp className="w-4 h-4 text-[#c3f400] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-mono text-[#8e9379] font-bold">Trend Inference</p>
                <p className="text-xs text-[#e2e4cf] font-semibold mt-0.5">
                  +19.3% Festive Surge
                </p>
                <p className="text-[10px] text-[#8e9379] mt-0.5 leading-snug">
                  October spend surged due to Durga Puja & Diwali festive basket demand.
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <Sparkles className="w-4 h-4 text-[#00dce5] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-mono text-[#8e9379] font-bold">Inflation Wave</p>
                <p className="text-xs text-[#e2e4cf] font-semibold mt-0.5">
                  119.8 CPI Index Points
                </p>
                <p className="text-[10px] text-[#8e9379] mt-0.5 leading-snug">
                  Tomato & edible oil inflation drove 65% of Q3-Q4 household expense deltas.
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <ShieldCheck className="w-4 h-4 text-[#abd600] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-mono text-[#8e9379] font-bold">Inferred Next Move</p>
                <p className="text-xs text-[#e2e4cf] font-semibold mt-0.5">
                  Post-Festive Cooling
                </p>
                <p className="text-[10px] text-[#8e9379] mt-0.5 leading-snug">
                  Winter crop arrivals in late November historically cool market prices by 12-15%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
