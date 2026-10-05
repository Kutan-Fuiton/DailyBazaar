/**
 * ItemDetailDrawer — Vaniq Item Intelligence Panel
 *
 * Slide-over drawer revealing:
 * - SVG price-trend area chart (30/60/90 day)
 * - Price stats (current, avg, min, max, inflation %)
 * - Vendor / market cheapest comparison leaderboard
 * - Restock cadence meter
 * - AI / RAG advisory bullets (Gemini-powered, graceful fallback)
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { itemsApi } from "../../shared/api/items";
import { intelligenceApi } from "../../shared/api/intelligence";
import { formatCurrency } from "../../shared/utils";
import type {
  Item,
  ItemDetails,
  AIInsights,
  PriceHistoryEntry,
  VendorEntry,
  MarketComparison,
  PriceForecast,
} from "../../shared/types";

const LIME  = "#c3f400";
const CYAN  = "#00dce5";
const MANGO = "#ffb86f";
const RED   = "#ff6b6b";

/* ── Mini SVG Price Chart ──────────────────────────────────────────────────── */
function PriceChart({
  data,
  width = 600,
  height = 160,
}: {
  data: PriceHistoryEntry[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-white/30">
        Not enough data points yet
      </div>
    );
  }

  const PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 28;
  const W = width - PAD_L - PAD_R;
  const H = height - PAD_T - PAD_B;

  const prices = data.map((d) => d.price);
  const minP   = Math.min(...prices);
  const maxP   = Math.max(...prices);
  const range  = maxP - minP || 1;

  const px = (i: number) => PAD_L + (i / (data.length - 1)) * W;
  const py = (p: number) => PAD_T + H - ((p - minP) / range) * H;

  const pathD = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.price)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L${px(data.length - 1)},${PAD_T + H} L${PAD_L},${PAD_T + H} Z`;

  // find min/max index
  const minIdx = prices.indexOf(minP);
  const maxIdx = prices.indexOf(maxP);

  // Y-axis labels
  const yTicks = [0, 0.5, 1].map((t) => ({
    val: minP + t * range,
    y: PAD_T + H - t * H,
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={LIME} stopOpacity="0.30" />
          <stop offset="100%" stopColor={LIME} stopOpacity="0.00" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {yTicks.map((t) => (
        <g key={t.y}>
          <line
            x1={PAD_L} x2={PAD_L + W}
            y1={t.y} y2={t.y}
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray="4 4"
          />
          <text
            x={PAD_L - 6} y={t.y + 4}
            textAnchor="end"
            fontSize="9"
            fill="#6b7155"
            fontFamily="Space Mono"
          >
            ₹{Math.round(t.val)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#areaGrad)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={LIME}
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#glow)"
      />

      {/* Min dot */}
      <circle cx={px(minIdx)} cy={py(minP)} r="5" fill="#111508" stroke={CYAN} strokeWidth="2" />
      <text
        x={px(minIdx)} y={py(minP) + 16}
        textAnchor="middle"
        fontSize="8"
        fill={CYAN}
        fontFamily="Space Mono"
      >
        MIN
      </text>

      {/* Max dot */}
      <circle cx={px(maxIdx)} cy={py(maxP)} r="5" fill="#111508" stroke={RED} strokeWidth="2" />
      <text
        x={px(maxIdx)} y={py(maxP) - 8}
        textAnchor="middle"
        fontSize="8"
        fill={RED}
        fontFamily="Space Mono"
      >
        MAX
      </text>

      {/* Latest dot with pulse */}
      <circle
        cx={px(data.length - 1)}
        cy={py(data[data.length - 1].price)}
        r="6"
        fill={LIME}
        filter="url(#glow)"
      />

      {/* X-axis date labels (first, mid, last) */}
      {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
        <text
          key={i}
          x={px(i)}
          y={PAD_T + H + 18}
          textAnchor="middle"
          fontSize="8"
          fill="#6b7155"
          fontFamily="Space Mono"
        >
          {data[i].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

/* ── Cadence Meter ─────────────────────────────────────────────────────────── */
function CadenceMeter({
  avgDays,
  daysSince,
}: {
  avgDays: number | null;
  daysSince: number | null;
}) {
  if (!avgDays || daysSince === null) return null;

  const pct    = Math.min((daysSince / avgDays) * 100, 100);
  const overdue = daysSince > avgDays;
  const barColor = overdue ? RED : pct > 70 ? MANGO : LIME;
  const label  = overdue
    ? `${daysSince - avgDays}d overdue`
    : `${avgDays - daysSince}d until restock`;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-mono uppercase">
        <span style={{ color: "#8e9379" }}>Restock Cycle</span>
        <span style={{ color: barColor }}>{label}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] font-mono" style={{ color: "#8e9379" }}>
        Avg every {avgDays}d · Last bought {daysSince}d ago
      </p>
    </div>
  );
}

/* ── Main Drawer ───────────────────────────────────────────────────────────── */
interface Props {
  item: Item | null;
  onClose: () => void;
  onUpdate?: () => void;
}

type DayRange = 30 | 60 | 90;

export default function ItemDetailDrawer({ item, onClose, onUpdate }: Props) {
  const [details,   setDetails]   = useState<ItemDetails | null>(null);
  const [insights,  setInsights]  = useState<AIInsights | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [days,      setDays]      = useState<DayRange>(30);
  const [activeTab, setActiveTab] = useState<"chart" | "vendors" | "ai" | "market" | "aliases">("chart");
  const [marketComparison, setMarketComparison] = useState<MarketComparison | null>(null);
  const [priceForecast, setPriceForecast] = useState<PriceForecast | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [aliases, setAliases] = useState<import("../../shared/types").ItemAlias[]>([]);
  const [newAliasText, setNewAliasText] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);

  const fetchDetails = useCallback(async (id: number, d: DayRange) => {
    setLoading(true);
    setDetails(null);
    try {
      const data = await itemsApi.getDetails(id, d);
      setDetails(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAI = useCallback(async (id: number) => {
    setAiLoading(true);
    try {
      const data = await itemsApi.getAIInsights(id);
      setInsights(data);
    } catch {
      setInsights(null);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const fetchIntel = useCallback(async (id: number) => {
    setIntelLoading(true);
    try {
      const [comp, fore] = await Promise.all([
        intelligenceApi.getMarketComparison(id),
        intelligenceApi.getPriceForecast(id),
      ]);
      setMarketComparison(comp);
      setPriceForecast(fore);
    } catch {
      setMarketComparison(null);
      setPriceForecast(null);
    } finally {
      setIntelLoading(false);
    }
  }, []);

  const handleAddAlias = async () => {
    if (!item || !newAliasText.trim() || savingAlias) return;
    setSavingAlias(true);
    try {
      const res: any = await itemsApi.addAlias(item.id, newAliasText.trim());
      setAliases((prev) => [...prev, { id: res.id || Date.now(), alias: newAliasText.trim().toLowerCase() }]);
      setNewAliasText("");
      onUpdate?.();
    } catch (err: any) {
      alert(err?.message || "Failed to add custom alias");
    } finally {
      setSavingAlias(false);
    }
  };

  const handleDeleteAlias = async (aliasId: number) => {
    if (!item) return;
    try {
      await itemsApi.deleteAlias(item.id, aliasId);
      setAliases((prev) => prev.filter((a) => a.id !== aliasId));
      onUpdate?.();
    } catch (err: any) {
      alert(err?.message || "Failed to delete alias");
    }
  };

  useEffect(() => {
    if (!item) return;
    setAliases(item.aliases || []);
    setNewAliasText("");
    setInsights(null);
    setDetails(null);
    setMarketComparison(null);
    setPriceForecast(null);
    setActiveTab("chart");
    fetchDetails(item.id, days);
    fetchAI(item.id);
    fetchIntel(item.id);
  }, [item]);

  useEffect(() => {
    if (!item || !details) return;
    fetchDetails(item.id, days);
  }, [days]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const st = details?.stats;
  const inflationPositive = (st?.inflation_pct ?? 0) >= 0;

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            key="drawer"
            className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
            style={{
              width: "min(560px, 100vw)",
              background: "rgba(14,18,7,0.97)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            {/* ── Drawer Header ── */}
            <div
              className="flex items-start justify-between p-6 pb-4 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: "rgba(195,244,0,0.08)", border: "1px solid rgba(195,244,0,0.2)" }}
                >
                  {item.emoji || "🛒"}
                </div>
                <div>
                  <h2 className="font-black text-lg uppercase truncate max-w-[280px]" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                    {item.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.category && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "#8e9379" }}>
                        {item.category}
                      </span>
                    )}
                    {item.tag && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(195,244,0,0.15)", color: LIME }}>
                        {item.tag}
                      </span>
                    )}
                    {item.unit && (
                      <span className="text-[10px] font-mono text-white/30">per {item.unit}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* ── Price Stat Bar ── */}
            {st && (
              <div className="grid grid-cols-3 gap-px mx-6 mt-4 mb-2 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  { label: "Current", value: `₹${st.current_price}`, color: LIME },
                  { label: "30d Avg", value: `₹${st.avg_price}`, color: "#e2e4cf" },
                  {
                    label: "Trend",
                    value: `${inflationPositive ? "▲" : "▼"} ${Math.abs(st.inflation_pct)}%`,
                    color: inflationPositive ? RED : CYAN,
                  },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center py-3 px-2 bg-white/[0.02]">
                    <span className="text-[9px] font-mono uppercase text-white/30 mb-1">{s.label}</span>
                    <span className="text-base font-black font-mono" style={{ color: s.color, fontFamily: "'Space Mono', monospace" }}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab Switcher ── */}
            <div className="mx-6 mt-3 mb-1 flex-shrink-0">
              <div className="p-1 rounded-xl flex gap-1 bg-white/5 border border-white/10">
                {[
                  { id: "chart",   label: "Price",     icon: "show_chart" },
                  { id: "vendors", label: "Markets",   icon: "store" },
                  { id: "market",  label: "Intel",     icon: "hub" },
                  { id: "aliases", label: "Aliases",   icon: "sell" },
                  { id: "ai",      label: "AI Tips",   icon: "auto_awesome" },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{ color: isActive ? "#111508" : "#8e9379", fontFamily: "'Syne', sans-serif" }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeItemTab"
                          className="absolute inset-0 rounded-lg"
                          style={{ background: LIME }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="material-symbols-outlined text-sm relative z-10">{tab.icon}</span>
                      <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 space-y-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(195,244,0,0.2) transparent" }}>

              {/* CHART TAB */}
              {activeTab === "chart" && (
                <div className="space-y-5">
                  {/* Day range switcher */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase text-white/40">Price History</p>
                    <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                      {([30, 60, 90] as DayRange[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDays(d)}
                          className="px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all"
                          style={{
                            background: days === d ? LIME : "transparent",
                            color: days === d ? "#111508" : "#8e9379",
                          }}
                        >
                          {d}D
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-4 rounded-2xl" style={{ minHeight: 180 }}>
                    {loading ? (
                      <div className="flex items-center justify-center h-36 gap-2 text-xs font-mono text-white/30">
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Loading chart…
                      </div>
                    ) : details?.price_history.length ? (
                      <PriceChart data={details.price_history} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-36 gap-2 text-white/30">
                        <span className="material-symbols-outlined text-3xl">show_chart</span>
                        <p className="text-xs font-mono">No price data for this period</p>
                      </div>
                    )}
                  </div>

                  {/* Min / Max callouts */}
                  {st && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-4 rounded-xl border border-cyan-400/20">
                        <p className="text-[9px] font-mono uppercase text-white/30 mb-1">All-Time Low</p>
                        <p className="text-lg font-black font-mono" style={{ color: CYAN }}>₹{st.min_price}</p>
                        {st.min_date && <p className="text-[9px] font-mono text-white/30 mt-1">{st.min_date}</p>}
                      </div>
                      <div className="glass-card p-4 rounded-xl border border-red-400/20">
                        <p className="text-[9px] font-mono uppercase text-white/30 mb-1">All-Time High</p>
                        <p className="text-lg font-black font-mono" style={{ color: RED }}>₹{st.max_price}</p>
                        {st.max_date && <p className="text-[9px] font-mono text-white/30 mt-1">{st.max_date}</p>}
                      </div>
                    </div>
                  )}

                  {/* Cadence meter */}
                  {details?.cadence && (
                    <div className="glass-card p-4 rounded-xl">
                      <CadenceMeter
                        avgDays={details.cadence.avg_cadence_days}
                        daysSince={details.cadence.days_since_last}
                      />
                    </div>
                  )}

                  {/* Stats footer */}
                  {details && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-4 rounded-xl">
                        <p className="text-[9px] font-mono uppercase text-white/30 mb-1">Total Hauls</p>
                        <p className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                          {details.purchase_count}×
                        </p>
                      </div>
                      <div className="glass-card p-4 rounded-xl">
                        <p className="text-[9px] font-mono uppercase text-white/30 mb-1">Total Spent</p>
                        <p className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: MANGO }}>
                          {formatCurrency(details.total_spent)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VENDORS TAB */}
              {activeTab === "vendors" && (
                <div className="space-y-4">
                  <p className="text-[10px] font-mono uppercase text-white/40">Market Price Comparison</p>

                  {loading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-xs font-mono text-white/30">
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      Comparing markets…
                    </div>
                  ) : details?.vendor_comparison.length ? (
                    <div className="space-y-3">
                      {details.vendor_comparison.map((v: VendorEntry, i: number) => {
                        const cheapest = details.vendor_comparison[0].price;
                        const savePct = i > 0 ? Math.round(((v.price - cheapest) / cheapest) * 100) : 0;
                        const medals = ["🥇", "🥈", "🥉"];
                        return (
                          <motion.div
                            key={v.vendor}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="glass-card p-4 rounded-xl flex items-center gap-4"
                            style={{
                              border: i === 0 ? "1px solid rgba(195,244,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <span className="text-xl flex-shrink-0">{medals[i] || "📍"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                                {v.vendor}
                              </p>
                              <p className="text-[10px] font-mono text-white/30">
                                {v.purchase_count} purchase{v.purchase_count !== 1 ? "s" : ""} recorded
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-base font-mono" style={{ color: i === 0 ? LIME : "#e2e4cf" }}>
                                ₹{v.price}
                              </p>
                              {savePct > 0 && (
                                <p className="text-[9px] font-mono" style={{ color: RED }}>+{savePct}% vs cheapest</p>
                              )}
                              {i === 0 && (
                                <p className="text-[9px] font-mono font-bold uppercase" style={{ color: LIME }}>Cheapest ✓</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}

                      {details.vendor_comparison.length >= 2 && (
                        <div className="glass-card p-4 rounded-xl bg-lime-400/5 border border-lime-400/20">
                          <p className="text-xs font-bold" style={{ color: LIME, fontFamily: "'Syne', sans-serif" }}>
                            💡 Savings Insight
                          </p>
                          <p className="text-xs mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#c4c9ac" }}>
                            Switching to <strong>{details.vendor_comparison[0].vendor}</strong> saves{" "}
                            <strong style={{ color: LIME }}>
                              ₹{(details.vendor_comparison[details.vendor_comparison.length - 1].price - details.vendor_comparison[0].price).toFixed(2)}
                            </strong>
                            {item.unit ? ` per ${item.unit}` : " per unit"} vs the most expensive option.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
                      <span className="material-symbols-outlined text-4xl">store</span>
                      <p className="text-xs font-mono text-center">
                        No location data yet.<br />
                        Tag a location when logging purchases to compare markets.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI TAB */}
              {activeTab === "ai" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" style={{ color: LIME }}>auto_awesome</span>
                    <p className="text-[10px] font-mono uppercase text-white/40">Vaniq AI Advisory</p>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: "rgba(195,244,0,0.1)", color: LIME }}>RAG</span>
                  </div>

                  {aiLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card p-5 rounded-2xl">
                          <div className="h-3 skeleton rounded w-1/3 mb-3" />
                          <div className="h-4 skeleton rounded w-full mb-2" />
                          <div className="h-4 skeleton rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : insights ? (
                    <div className="space-y-3">
                      {[
                        {
                          icon: "schedule",
                          title: "Market Timing",
                          content: insights.market_timing,
                          color: MANGO,
                          bg: "rgba(255,184,111,0.08)",
                          border: "rgba(255,184,111,0.2)",
                        },
                        {
                          icon: "kitchen",
                          title: "Storage Tip",
                          content: insights.storage_tip,
                          color: CYAN,
                          bg: "rgba(0,220,229,0.08)",
                          border: "rgba(0,220,229,0.2)",
                        },
                        {
                          icon: "savings",
                          title: "Smart Buy",
                          content: insights.smart_buy,
                          color: LIME,
                          bg: "rgba(195,244,0,0.08)",
                          border: "rgba(195,244,0,0.2)",
                        },
                      ].map((card, i) => (
                        <motion.div
                          key={card.title}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-5 rounded-2xl"
                          style={{
                            background: card.bg,
                            border: `1px solid ${card.border}`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-base" style={{ color: card.color }}>{card.icon}</span>
                            <p className="text-[10px] font-black uppercase font-mono tracking-wider" style={{ color: card.color }}>
                              {card.title}
                            </p>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#c4c9ac" }}>
                            {card.content}
                          </p>
                        </motion.div>
                      ))}

                      <p className="text-[9px] font-mono text-white/20 text-center">
                        Powered by Gemini · Personalized to your purchase history · Cached 24h
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
                      <span className="material-symbols-outlined text-4xl">psychology</span>
                      <p className="text-xs font-mono text-center">
                        AI advisory unavailable.<br />Service is currently being provisioned.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* MARKET INTEL TAB */}
              {activeTab === "market" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" style={{ color: LIME }}>hub</span>
                    <p className="text-[10px] font-mono uppercase text-white/40">Crowdsourced Price Intelligence</p>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">LIVE</span>
                  </div>

                  {intelLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-xs font-mono text-white/30">
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      Calculating market benchmarks…
                    </div>
                  ) : (
                    <>
                      {/* Comparison Card */}
                      {marketComparison && (
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-[9px] font-mono uppercase text-[#8e9379] block mb-1">Your Avg Price</span>
                              <span className="text-lg font-black font-mono text-white">
                                {marketComparison.user_avg_price != null ? formatCurrency(marketComparison.user_avg_price) : "—"}
                              </span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-lime-400/10 border border-lime-400/20">
                              <span className="text-[9px] font-mono uppercase text-lime-400 block mb-1">Market Benchmark</span>
                              <span className="text-lg font-black font-mono text-lime-400">
                                {marketComparison.market_avg_price != null ? formatCurrency(marketComparison.market_avg_price) : "—"}
                              </span>
                            </div>
                          </div>

                          {marketComparison.savings_pct != null ? (
                            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
                              marketComparison.savings_pct >= 0
                                ? "bg-lime-400/10 border-lime-400/30 text-lime-300"
                                : "bg-amber-400/10 border-amber-400/30 text-amber-300"
                            }`}>
                              <span className="material-symbols-outlined text-base">
                                {marketComparison.savings_pct >= 0 ? "verified" : "warning"}
                              </span>
                              <span>
                                {marketComparison.savings_pct >= 0
                                  ? `You save approx ${marketComparison.savings_pct.toFixed(1)}% compared to the bazaar average!`
                                  : `You are paying ${Math.abs(marketComparison.savings_pct).toFixed(1)}% above bazaar average.`}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[10px] font-mono text-white/40">
                              Aggregate based on {marketComparison.sample_size} anonymous community purchases.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Forecast Card */}
                      {priceForecast && (
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-white font-mono flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-lime-400">trending_up</span>
                              30-Day Forecast
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              priceForecast.trend === "rising"
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : priceForecast.trend === "falling"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-lime-500/20 text-lime-300 border border-lime-500/30"
                            }`}>
                              {priceForecast.trend}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <span className="text-[9px] font-mono uppercase text-[#8e9379] block">Projected (7-Day)</span>
                              <span className="text-sm font-mono font-bold text-white">
                                {priceForecast.projected_price_7d != null ? formatCurrency(priceForecast.projected_price_7d) : "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono uppercase text-[#8e9379] block">Model Confidence</span>
                              <span className="text-sm font-mono font-bold text-cyan-400">
                                {Math.round(priceForecast.confidence * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 font-mono">
                            💡 <span className="font-bold text-white">Advisory:</span> {priceForecast.best_buy_window}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ALIASES TAB */}
              {activeTab === "aliases" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" style={{ color: LIME }}>sell</span>
                    <p className="text-[10px] font-mono uppercase text-white/40">Custom Item Nicknames & Regional Aliases</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <p className="text-xs text-[#c4c9ac] leading-relaxed" style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}>
                      Give this item custom names (e.g. <span className="text-lime-300 font-mono">"baba r cha"</span>, <span className="text-lime-300 font-mono">"deshi dim"</span>, <span className="text-lime-300 font-mono">"sarson"</span>).
                      When you write or scan receipts using this name, Vaniq automatically identifies this item!
                    </p>

                    {/* Add Alias Input */}
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Add custom alias / nickname..."
                        value={newAliasText}
                        onChange={(e) => setNewAliasText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddAlias()}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-lime-400/50 outline-none"
                      />
                      <button
                        onClick={handleAddAlias}
                        disabled={savingAlias || !newAliasText.trim()}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all flex items-center gap-1.5"
                        style={{
                          background: LIME,
                          color: "#111508",
                          fontFamily: "'Syne', sans-serif",
                          boxShadow: "2px 2px 0px #000",
                        }}
                      >
                        {savingAlias ? "Adding..." : "+ Add"}
                      </button>
                    </div>
                  </div>

                  {/* Existing Aliases List */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono uppercase text-white/30">Active Aliases ({aliases.length})</p>
                    {aliases.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center text-xs font-mono text-white/40">
                        No custom nicknames added yet. Type a name above and click + Add.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {aliases.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-white/10 border border-white/10 text-white group"
                          >
                            <span style={{ color: LIME }}>🏷️ {a.alias}</span>
                            <button
                              onClick={() => handleDeleteAlias(a.id)}
                              className="hover:text-red-400 text-white/40 transition-colors p-0.5"
                              title="Delete alias"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
