/**
 * StatsPage.tsx — DailyBazaar Statistics & Item Intelligence Dashboard.
 *
 * Sections:
 * 1. Financial overview & metrics
 * 2. 6-Month Monthly Spending Bar Chart
 * 3. Top 10 Common Items Leaderboard
 * 4. Dual-scope Item Price Search (Personal vs Global Lexicon) with Sparklines
 * 5. Interactive Item Detail Modal with 30-day Price Trend & Location Comparisons
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { statsApi, type StatsOverviewResponse } from "../../shared/api/stats";

import SpendingBarChart from "./components/SpendingBarChart";
import TopItemsRanking from "./components/TopItemsRanking";
import BazaarTimingRadar from "./components/BazaarTimingRadar";
import ItemSearchSection from "./components/ItemSearchSection";
import ItemDetailModal from "./components/ItemDetailModal";
import Loader from "../../shared/components/Loader";

const LIME = "#c3f400";
const CYAN = "#00dce5";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
} as const;

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export default function StatsPage() {
  const [overview, setOverview] = useState<StatsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await statsApi.overview();
        if (!cancelled) setOverview(data);
      } catch (err) {
        console.error("Failed to load stats overview:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      {/* Top green gradient shader */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "40vh",
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(171,214,0,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="page-container pt-20 pb-28 relative z-10">
        {/* Header */}
        <motion.div className="mb-6" {...fadeUp} transition={{ duration: 0.4 }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: LIME,
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Analytics & Price Intelligence
          </p>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(26px, 5vw, 36px)",
              fontWeight: 800,
              color: "#e2e4cf",
              letterSpacing: "-0.02em",
            }}
          >
            Bazaar Statistics<span style={{ color: LIME }}>.</span>
          </h1>
          <p style={{ color: "#8e9379", fontSize: "13px", marginTop: "4px" }}>
            Track price trends, common shopping items, and multi-market rate comparisons.
          </p>
        </motion.div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader
              variant="analytics"
              title="Analyzing Bazaar Intelligence"
              subtitle="Calculating price trends, monthly spend & rate variance…"
            />
          </div>
        ) : (
          <>
            {/* Overview Metric Badges */}
            <motion.div
              className="grid grid-cols-3 gap-3 mb-8"
              {...fadeUp}
              transition={{ delay: 0.08, duration: 0.45 }}
            >
          <div
            className="glass-card p-3.5 rounded-2xl text-center"
            style={{
              background: "rgba(26, 31, 15, 0.75)",
              border: "1px solid rgba(195, 244, 0, 0.16)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#8e9379] font-semibold">
              All-Time Spend
            </p>
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(18px, 3.5vw, 24px)",
                fontWeight: 800,
                color: LIME,
                marginTop: "2px",
              }}
            >
              ₹{fmt(overview?.total_spent_all_time ?? 0)}
            </p>
          </div>

          <div
            className="glass-card p-3.5 rounded-2xl text-center"
            style={{
              background: "rgba(26, 31, 15, 0.75)",
              border: "1px solid rgba(195, 244, 0, 0.16)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#8e9379] font-semibold">
              Total Hauls
            </p>
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(18px, 3.5vw, 24px)",
                fontWeight: 800,
                color: "#e2e4cf",
                marginTop: "2px",
              }}
            >
              {overview?.total_transactions_count ?? 0}
            </p>
          </div>

          <div
            className="glass-card p-3.5 rounded-2xl text-center"
            style={{
              background: "rgba(26, 31, 15, 0.75)",
              border: "1px solid rgba(195, 244, 0, 0.16)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#8e9379] font-semibold">
              Tracked Items
            </p>
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(18px, 3.5vw, 24px)",
                fontWeight: 800,
                color: CYAN,
                marginTop: "2px",
              }}
            >
              {overview?.total_unique_items ?? 0}
            </p>
          </div>
        </motion.div>

        {/* Charts Grid: Monthly Spend + Top 10 Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <SpendingBarChart
            data={overview?.monthly_spending ?? []}
            loading={loading}
          />

          <TopItemsRanking
            items={overview?.top_items ?? []}
            onSelectItem={(id) => setSelectedItemId(id)}
            loading={loading}
          />
        </div>

        {/* Bazaar Timing Radar: Day of Week Price Inferences */}
        <BazaarTimingRadar />

        {/* Item Search & Price Sparklines */}
        <ItemSearchSection onSelectItem={(id) => setSelectedItemId(id)} />

        {/* Item Detail Modal */}
        <ItemDetailModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
          </>
        )}
      </div>
    </div>
  );
}
