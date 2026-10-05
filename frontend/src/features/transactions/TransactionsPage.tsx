/**
 * TransactionsPage — Vaniq "My Spending" / "My Damage" page.
 *
 * Sections:
 * - "MY DAMAGE" display header with financial pulse
 * - Total Damage Bento Card & 7-day bar chart (live from API)
 * - Spending DNA / category breakdown (live from profile stats)
 * - All Hauls / Past transaction list (live from /transactions)
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { dashboardApi } from "../../shared/api/dashboard";
import { transactionsApi } from "../../shared/api/transactions";
import type { TrendEntry, Transaction, SpendingDnaEntry, DashboardSummary, MonthlyForecast } from "../../shared/types";

const LIME     = "#c3f400";
const LIME_DIM = "#abd600";
const CYAN     = "#00dce5";
const SC       = "#1e2113";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

/* ─────────────────────────────────────────────────────── */

export default function TransactionsPage() {
  const [trends,       setTrends]       = useState<TrendEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dna,          setDna]          = useState<SpendingDnaEntry[]>([]);
  const [summary,      setSummary]      = useState<DashboardSummary | null>(null);
  const [forecast,     setForecast]     = useState<MonthlyForecast | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [editingTxId,  setEditingTxId]  = useState<number | null>(null);
  const [editTitle,    setEditTitle]    = useState("");
  const [renaming,     setRenaming]     = useState(false);

  const handleStartRename = (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    setEditingTxId(tx.id);
    setEditTitle(tx.title);
  };

  const handleSaveRename = async (e: React.MouseEvent, txId: number) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    setRenaming(true);
    try {
      const updated = await transactionsApi.update(txId, { title: editTitle.trim() });
      setTransactions((prev) => prev.map((t) => (t.id === txId ? updated : t)));
      setEditingTxId(null);
    } catch (err) {
      console.error("Failed to rename transaction:", err);
    } finally {
      setRenaming(false);
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [tRes, txRes, profileRes, sumRes, fcRes] = await Promise.allSettled([
      dashboardApi.trends(),
      transactionsApi.list({ limit: 50 }),
      dashboardApi.profileStats(),
      dashboardApi.summary(),
      dashboardApi.forecast(),
    ]);
    if (tRes.status       === "fulfilled") setTrends(tRes.value.data ?? []);
    if (txRes.status      === "fulfilled") setTransactions(txRes.value ?? []);
    if (profileRes.status === "fulfilled") setDna(profileRes.value.spending_dna ?? []);
    if (sumRes.status     === "fulfilled") setSummary(sumRes.value.data);
    if (fcRes.status      === "fulfilled") setForecast(fcRes.value.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const maxAmount = Math.max(...trends.map((t) => t.amount), 1);

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(171,214,0,0.12) 0%, rgba(17,21,8,0) 65%)" }}
      />

      <div className="page-container pt-20 pb-24 relative">

        {/* ── Header ── */}
        <motion.div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10" {...fadeUp}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ fontFamily: "'Space Mono', monospace", color: LIME }}>
              Financial Pulse
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
              MY DAMAGE
            </h1>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-mono text-white/70">
              Live Vault Sync
            </span>
          </div>
        </motion.div>

        {/* ── Bento Grid: Total Damage + 7-Day Bar Chart ── */}
        <motion.div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-10" {...fadeUp} transition={{ delay: 0.1, duration: 0.6 }}>
          {/* Left: Total + chart */}
          <div className="md:col-span-8 glass-card p-7 animate-breath" style={{ boxShadow: "4px 4px 0px #000" }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: "'Space Mono', monospace", color: CYAN }}>
                  Total Damage (All Time)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-6xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                    {loading ? "—" : `₹${fmt(summary?.total_damage ?? 0)}`}
                  </span>
                  {summary && summary.total_damage_change_pct !== 0 && (
                    <span
                      className="font-black text-lg"
                      style={{ fontFamily: "'Syne', sans-serif", color: summary.total_damage_change_pct > 0 ? "#ffb4ab" : LIME_DIM }}
                    >
                      {summary.total_damage_change_pct > 0 ? "+" : ""}{summary.total_damage_change_pct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: LIME, boxShadow: "4px 4px 0px #000" }}>
                <span className="material-symbols-outlined" style={{ color: "#283500", fontSize: "22px" }}>payments</span>
              </div>
            </div>

            {/* 7-Day Bar Chart */}
            <div className="flex items-end gap-2 h-28 mt-6">
              {(loading ? Array(7).fill({ day: "—", amount: 0, date: "" }) : trends).map((bar, i) => {
                const h = loading ? 20 + (i * 13) % 60 : Math.max(4, (bar.amount / maxAmount) * 100);
                const isToday = !loading && bar.date === new Date().toISOString().split("T")[0];
                return (
                  <div key={i} className="flex-1 group relative">
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                      style={{ background: SC, color: LIME, fontFamily: "'Space Mono', monospace" }}
                    >
                      {bar.day}: ₹{fmt(bar.amount)}
                    </div>
                    <motion.div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        backgroundColor: isToday ? LIME_DIM : loading ? "rgba(195,244,0,0.08)" : "rgba(195,244,0,0.15)",
                        transformOrigin: "bottom",
                      }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              className="flex justify-between mt-3 text-[10px] uppercase tracking-widest"
              style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
            >
              {(loading ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] : trends.map((t) => t.day)).map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

          {/* Right: Stats & Forecast card */}
          <div
            className="md:col-span-4 glass-card p-7 flex flex-col justify-between"
            style={{ background: "rgba(40,43,29,0.7)", boxShadow: "4px 4px 0px #000" }}
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black uppercase flex items-center gap-2"
                  style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                  <span className="material-symbols-outlined" style={{ color: CYAN, fontSize: "20px" }}>insights</span>
                  FORECAST & STATS
                </h3>
                {forecast && (
                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      background: forecast.status === "higher" ? "rgba(255,180,171,0.15)" : "rgba(195,244,0,0.15)",
                      color: forecast.status === "higher" ? "#ffb4ab" : LIME,
                    }}
                  >
                    {forecast.status.replace("_", " ")} ({forecast.pace_pct > 0 ? "+" : ""}{forecast.pace_pct}%)
                  </span>
                )}
              </div>
              {[
                { label: "Projected Month-End", value: loading || !forecast ? "—" : `₹${fmt(forecast.projected_total)}`, color: CYAN },
                { label: "Month-to-Date (MTD)", value: loading || !forecast ? "—" : `₹${fmt(forecast.current_total)} (${forecast.remaining_days}d left)`, color: "#ffb86f" },
                { label: "Avg Daily Spend",     value: loading ? "—" : `₹${fmt(summary?.avg_daily_spend ?? 0)}`,    color: LIME },
                { label: "Total Hauls",         value: loading ? "—" : String(summary?.total_transactions ?? 0),    color: LIME_DIM },
              ].map((s) => (
                <div key={s.label} className="mb-3">
                  <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
                    {s.label}
                  </p>
                  <p className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: s.color }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            {forecast && (
              <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[10px]" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
                <span>Run-rate: ₹{fmt(forecast.avg_daily)}/day</span>
                <span>Days elapsed: {forecast.days_elapsed}/{forecast.days_in_month}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Spending DNA ── */}
        {(dna.length > 0 || loading) && (
          <motion.section className="mb-10" {...fadeUp} transition={{ delay: 0.2, duration: 0.6 }}>
            <p className="text-[10px] uppercase tracking-[0.3em] mb-4" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
              Spending DNA
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(loading ? Array(4).fill({ label: "—", pct: 0, color: "#333627" }) : dna).map((s, i) => (
                <motion.div
                  key={i}
                  className="glass-card p-5 cursor-pointer"
                  style={{ boxShadow: "3px 3px 0px #000" }}
                  whileHover={{ scale: 1.03 }}
                >
                  <h3 className="font-black uppercase mb-1 text-sm truncate" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                    {s.label}
                  </h3>
                  <p className="text-2xl font-black mb-3" style={{ fontFamily: "'Syne', sans-serif", color: s.color }}>
                    {loading ? "—" : `${s.pct}%`}
                  </p>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: loading ? "20%" : `${s.pct}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Transaction List ── */}
        <motion.section {...fadeUp} transition={{ delay: 0.3, duration: 0.6 }}>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-black uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
              ALL HAULS
            </h2>
            <span className="text-[10px] uppercase font-mono text-white/50">
              {transactions.length} total
            </span>
          </div>

          {!loading && transactions.length === 0 ? (
            <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-5xl" style={{ color: "#444933", fontSize: "48px" }}>receipt_long</span>
              <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
                No transactions yet. Scan a bill or log purchases in the Scan tab!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(loading ? Array(3).fill(null) : transactions).map((tx, i) => (
                <div
                  key={loading ? i : (tx as Transaction).id}
                  className="glass-card p-5 flex items-center justify-between group cursor-pointer"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                >
                  {loading ? (
                    <div className="flex-1 flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl skeleton flex-shrink-0" />
                      <div className="flex-1">
                        <div className="h-3 skeleton rounded w-32 mb-2" />
                        <div className="h-2 skeleton rounded w-48" />
                      </div>
                      <div className="h-5 skeleton rounded w-20" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{ background: SC, color: LIME, fontFamily: "'Syne', sans-serif" }}
                        >
                          {(tx as Transaction).title.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingTxId === (tx as Transaction).id ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                autoFocus
                                className="px-2 py-1 rounded bg-black/40 border border-[#c3f400] text-sm text-[#e2e4cf] focus:outline-none"
                              />
                              <button
                                onClick={(e) => handleSaveRename(e, (tx as Transaction).id)}
                                disabled={renaming}
                                className="p-1 rounded bg-[#c3f400] text-[#111508] text-xs font-bold"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingTxId(null); }}
                                className="p-1 rounded bg-white/10 text-white/70 text-xs"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-base truncate" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                                {(tx as Transaction).title}
                              </h4>
                              <button
                                onClick={(e) => handleStartRename(e, tx as Transaction)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-xs text-[#8e9379] hover:text-[#c3f400]"
                                title="Rename haul"
                                style={{ background: "none", border: "none", cursor: "pointer" }}
                              >
                                <span className="material-symbols-outlined text-xs">edit</span>
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                              style={{
                                background: (tx as Transaction).status === "completed" ? "rgba(195,244,0,0.12)" : "rgba(255,184,111,0.12)",
                                color: (tx as Transaction).status === "completed" ? LIME_DIM : "#ffb86f",
                                fontFamily: "'Space Mono', monospace",
                              }}
                            >
                              {(tx as Transaction).status}
                            </span>
                            <span className="text-[10px]" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
                              {timeAgo((tx as Transaction).created_at)}
                            </span>
                            <span className="text-[10px]" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
                              · {(tx as Transaction).items.length} items
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                        <span className="font-black text-lg" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                          ₹{fmt((tx as Transaction).total)}
                        </span>
                        <span
                          className="text-[9px] font-bold px-3 py-1 rounded-full uppercase"
                          style={{
                            background: LIME,
                            color: "#283500",
                            fontFamily: "'Space Mono', monospace",
                            boxShadow: "2px 2px 0px #000",
                          }}
                        >
                          Bag Secured 💸
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
