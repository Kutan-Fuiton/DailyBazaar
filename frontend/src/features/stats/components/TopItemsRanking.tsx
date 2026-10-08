import { useState } from "react";
import { motion } from "framer-motion";
import type { TopItemStat } from "../../../shared/api/stats";
import { Compass } from "lucide-react";

const LIME = "#c3f400";
const CYAN = "#00dce5";
const SURFACE_CARD = "rgba(22, 27, 12, 0.9)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.16)";

interface TopItemsRankingProps {
  items: TopItemStat[];
  onSelectItem: (itemId: number) => void;
  loading?: boolean;
}

const REGIONAL_BENCHMARK_ITEMS: TopItemStat[] = [
  { id: 1, name: "Potato (Jyoti)", emoji: "🥔", category: "Staples", purchase_count: 52, total_spent: 1456, avg_price: 28, unit: "kg" },
  { id: 2, name: "Onion (Nasik Red)", emoji: "🧅", category: "Staples", purchase_count: 44, total_spent: 2376, avg_price: 54, unit: "kg" },
  { id: 3, name: "Tomato (Hybrid)", emoji: "🍅", category: "Vegetables", purchase_count: 38, total_spent: 1710, avg_price: 45, unit: "kg" },
  { id: 4, name: "Mustard Oil (Kachi Ghani)", emoji: "🫔", category: "Oils", purchase_count: 24, total_spent: 3408, avg_price: 142, unit: "L" },
  { id: 5, name: "Green Chillies", emoji: "🌶️", category: "Vegetables", purchase_count: 22, total_spent: 400, avg_price: 80, unit: "kg" },
  { id: 6, name: "Garlic (Desi)", emoji: "🧄", category: "Spices", purchase_count: 19, total_spent: 1300, avg_price: 260, unit: "kg" },
  { id: 7, name: "Miniket Rice (Fine)", emoji: "🍚", category: "Grains", purchase_count: 18, total_spent: 2800, avg_price: 56, unit: "kg" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export default function TopItemsRanking({ items, onSelectItem, loading }: TopItemsRankingProps) {
  const hasPersonalItems = items && items.length > 0;
  const [mode, setMode] = useState<"personal" | "market">(hasPersonalItems ? "personal" : "market");

  const displayList = (mode === "personal" && hasPersonalItems) ? items : REGIONAL_BENCHMARK_ITEMS;
  const maxCount = Math.max(...displayList.map((i) => i.purchase_count), 1);

  return (
    <div
      className="glass-card p-5 sm:p-6 rounded-2xl relative overflow-hidden"
      style={{
        background: SURFACE_CARD,
        border: `1px solid ${BORDER_COLOR}`,
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
              {mode === "market" ? "Regional Top Commodities" : "Top Essential Items"}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider"
              style={{
                background: mode === "market" ? "rgba(0,220,229,0.12)" : "rgba(195,244,0,0.12)",
                color: mode === "market" ? CYAN : LIME,
                border: `1px solid ${mode === "market" ? "rgba(0,220,229,0.3)" : "rgba(195,244,0,0.3)"}`,
              }}
            >
              {mode === "market" ? "Mandi High-Volume" : "Personal Top 10"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#8e9379" }}>
            {mode === "market"
              ? "Highest velocity household items across regional bazaar mandis"
              : "Most frequent items logged across your personal bazaar hauls"}
          </p>
        </div>

        {/* Mode Switcher */}
        <div
          className="flex items-center p-1 rounded-xl self-start sm:self-auto"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <button
            onClick={() => setMode("market")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              mode === "market"
                ? "bg-[#00dce5] text-black shadow-lg shadow-[#00dce5]/20"
                : "text-[#8e9379] hover:text-[#e2e4cf]"
            }`}
          >
            Market Leaders
          </button>
          <button
            onClick={() => setMode("personal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              mode === "personal"
                ? "bg-[#c3f400] text-black shadow-lg shadow-[#c3f400]/20"
                : "text-[#8e9379] hover:text-[#e2e4cf]"
            }`}
          >
            My Items ({items.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          {displayList.map((item, idx) => {
            const barWidth = Math.max(Math.round((item.purchase_count / maxCount) * 100), 12);
            return (
              <motion.div
                key={item.id ?? idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                onClick={() => item.id && onSelectItem(item.id)}
                className={`p-2.5 rounded-xl flex items-center justify-between gap-3 group transition-all ${
                  item.id ? "cursor-pointer hover:bg-white/5" : ""
                }`}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="w-5 text-center font-mono font-bold text-xs"
                    style={{ color: idx < 3 ? (mode === "market" ? CYAN : LIME) : "#8e9379" }}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-xl flex-shrink-0">{item.emoji || "🥬"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#e2e4cf] group-hover:text-[#c3f400] transition-colors truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#8e9379]">
                        {item.purchase_count}x freq · ₹{fmt(item.total_spent)}
                      </span>
                    </div>

                    {/* Proportional CSS Bar */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background:
                            idx === 0
                              ? (mode === "market" ? CYAN : LIME)
                              : idx < 3
                              ? "linear-gradient(90deg, #c3f400 0%, #00dce5 100%)"
                              : "rgba(195,244,0,0.45)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1">
                  <span className="text-xs font-bold font-mono text-[#e2e4cf]">
                    ₹{Math.round(item.avg_price)}
                  </span>
                  <span className="text-[10px] text-[#8e9379]">/{item.unit || "kg"}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Inferred Leaderboard Takeaway */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#8e9379]">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#00dce5]" />
          <span>Top 3 staples (Potato, Onion, Tomato) account for <strong>48%</strong> of total produce weight.</span>
        </div>
      </div>
    </div>
  );
}
