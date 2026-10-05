import { motion } from "framer-motion";
import type { MonthlySpendingPoint } from "../../../shared/api/stats";

const LIME = "#c3f400";
const SURFACE_CARD = "rgba(26, 31, 15, 0.85)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.16)";

interface SpendingBarChartProps {
  data: MonthlySpendingPoint[];
  loading?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export default function SpendingBarChart({ data, loading }: SpendingBarChartProps) {
  const maxSpend = Math.max(...data.map((d) => d.total), 100);

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
            Monthly Spending
          </h3>
          <p style={{ fontSize: "11px", color: "#8e9379" }}>Past 6 calendar months</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(195,244,0,0.08)", color: LIME, border: `1px solid ${BORDER_COLOR}` }}
        >
          6-Month Vault
        </span>
      </div>

      {loading ? (
        <div className="h-44 flex items-end justify-between gap-3 pt-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 bg-white/5 rounded-t-lg" style={{ height: `${i * 15}%` }} />
          ))}
        </div>
      ) : (
        <div className="h-48 flex items-end justify-between gap-2.5 pt-6 pb-1">
          {data.map((point, idx) => {
            const heightPct = Math.max(Math.round((point.total / maxSpend) * 100), 6);
            const isLatest = idx === data.length - 1;

            return (
              <div key={point.month_key} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                {/* Tooltip on hover */}
                <div
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap mb-1"
                  style={{
                    background: "#111508",
                    color: LIME,
                    border: "1px solid rgba(195,244,0,0.3)",
                  }}
                >
                  ₹{fmt(point.total)}
                </div>

                {/* Bar */}
                <div className="w-full max-w-[42px] bg-white/5 rounded-t-lg overflow-hidden relative flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                    className="w-full rounded-t-lg transition-all group-hover:brightness-125"
                    style={{
                      background: isLatest
                        ? `linear-gradient(180deg, ${LIME} 0%, rgba(195,244,0,0.4) 100%)`
                        : "linear-gradient(180deg, rgba(195,244,0,0.7) 0%, rgba(195,244,0,0.2) 100%)",
                      boxShadow: isLatest ? "0 0 12px rgba(195,244,0,0.35)" : "none",
                    }}
                  />
                </div>

                {/* Month Label */}
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    fontWeight: isLatest ? 700 : 500,
                    color: isLatest ? LIME : "#8e9379",
                  }}
                >
                  {point.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
