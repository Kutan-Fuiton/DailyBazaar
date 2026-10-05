import { motion } from "framer-motion";
import type { DashboardSummary, TopItem } from "../../../shared/types";
import Loader from "../../../shared/components/Loader";

const LIME = "#c3f400";
const LIME_DIM = "#abd600";
const CYAN = "#00dce5";
const SURFACE_CARD = "rgba(26, 31, 15, 0.75)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.14)";

interface StatsCardsProps {
  summary: DashboardSummary | null;
  topItems: TopItem[];
  loading?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export default function StatsCards({ summary, topItems, loading }: StatsCardsProps) {
  if (loading && !summary) {
    return (
      <section className="w-full mb-8">
        <Loader variant="home" />
      </section>
    );
  }

  const trend = summary?.total_damage_change_pct ?? 0;
  const trendLabel =
    trend === 0
      ? "same as last month"
      : trend > 0
      ? `↑ ${trend}% from last month`
      : `↓ ${Math.abs(trend)}% from last month`;
  const trendColor = trend > 0 ? "#ffb4ab" : trend < 0 ? LIME : "#8e9379";

  const maxCount = Math.max(...topItems.slice(0, 5).map((i) => i.purchase_count || 1), 1);

  return (
    <section className="w-full mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "16px",
            fontWeight: 700,
            color: "#e2e4cf",
            letterSpacing: "-0.01em",
          }}
        >
          Your Overview
        </h2>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            color: "#8e9379",
            fontWeight: 500,
          }}
        >
          This Month
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Spending Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between"
          style={{
            background: SURFACE_CARD,
            border: `1px solid ${BORDER_COLOR}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {/* Subtle background glow wave */}
          <div className="absolute inset-x-0 bottom-0 h-16 opacity-[0.06] pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 120">
              <path
                d="M0,80 Q200,20 400,70 T700,50 T1000,80 L1000,120 L0,120 Z"
                fill={LIME_DIM}
              />
            </svg>
          </div>

          <div className="relative z-10">
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "#8e9379",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Spent This Month
            </p>

            <div className="flex items-baseline gap-2 mb-2">
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: LIME,
                }}
              >
                ₹
              </span>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "clamp(34px, 6vw, 44px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#e2e4cf",
                  lineHeight: 1,
                }}
              >
                {loading ? "—" : fmt(summary?.total_damage ?? 0)}
              </span>
            </div>

            {!loading && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                  color: trendColor,
                  fontWeight: 500,
                }}
              >
                {trendLabel}
              </p>
            )}

            {!summary && !loading && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8e9379" }}>
                No purchases yet this month.
              </p>
            )}
          </div>

          {/* Savings Potential Badge */}
          {!loading && summary && (summary.savings_potential ?? 0) > 0 && (
            <div
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit relative z-10"
              style={{
                background: "rgba(0,220,229,0.08)",
                border: "1px solid rgba(0,220,229,0.18)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px", color: CYAN, lineHeight: 1 }}
              >
                savings
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "11px",
                  color: CYAN,
                  fontWeight: 600,
                }}
              >
                ₹{fmt(summary.savings_potential)} savings potential
              </span>
            </div>
          )}
        </motion.div>

        {/* Card 2: Top Common Items Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="glass-card p-5 rounded-2xl flex flex-col justify-between"
          style={{
            background: SURFACE_CARD,
            border: `1px solid ${BORDER_COLOR}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: "#8e9379",
                  textTransform: "uppercase",
                }}
              >
                Frequent Items
              </p>
              <span style={{ fontSize: "11px", color: LIME, fontWeight: 500 }}>
                {topItems.length > 0 ? "Top 5" : ""}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 rounded bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : topItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8e9379]">
                Scan your first few bills to see common items tracked here.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {topItems.slice(0, 5).map((item, idx) => {
                  const pct = Math.round(((item.purchase_count || 1) / maxCount) * 100);
                  return (
                    <div key={item.id ?? idx} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-[#e2e4cf] truncate max-w-[170px]">
                          <span>{item.emoji || "🥬"}</span>
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="text-[11px] text-[#8e9379] font-mono">
                          {item.purchase_count}x · ₹{fmt(item.price)}
                        </span>
                      </div>

                      {/* Pure CSS Bar */}
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.05 }}
                          className="h-full rounded-full"
                          style={{
                            background: idx === 0 ? LIME : "rgba(195, 244, 0, 0.65)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
