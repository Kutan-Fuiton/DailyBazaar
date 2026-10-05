import { motion } from "framer-motion";
import type { TopItemStat } from "../../../shared/api/stats";

const LIME = "#c3f400";
const SURFACE_CARD = "rgba(26, 31, 15, 0.85)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.16)";

interface TopItemsRankingProps {
  items: TopItemStat[];
  onSelectItem: (itemId: number) => void;
  loading?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export default function TopItemsRanking({ items, onSelectItem, loading }: TopItemsRankingProps) {
  const maxCount = Math.max(...items.map((i) => i.purchase_count), 1);

  return (
    <div
      className="glass-card p-5 rounded-2xl"
      style={{
        background: SURFACE_CARD,
        border: `1px solid ${BORDER_COLOR}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "#e2e4cf",
            }}
          >
            Top 10 Essential Items
          </h3>
          <p style={{ fontSize: "11px", color: "#8e9379" }}>Most frequent items across your hauls</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(195,244,0,0.08)", color: LIME, border: `1px solid ${BORDER_COLOR}` }}
        >
          Leaderboard
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#8e9379]">
          No items found yet. Scan bills to generate your personal top items.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const barWidth = Math.max(Math.round((item.purchase_count / maxCount) * 100), 10);
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
                    style={{ color: idx < 3 ? LIME : "#8e9379" }}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-lg">{item.emoji || "🥬"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#e2e4cf] group-hover:text-[#c3f400] transition-colors truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#8e9379]">
                        {item.purchase_count}x · ₹{fmt(item.total_spent)}
                      </span>
                    </div>

                    {/* Proportional CSS Bar */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: idx === 0 ? LIME : idx < 3 ? "#00dce5" : "rgba(195,244,0,0.5)",
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
    </div>
  );
}
