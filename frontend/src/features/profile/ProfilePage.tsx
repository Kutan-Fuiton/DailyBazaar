/**
 * ProfilePage — Vaniq Analytics, Gamification & Settings
 * Dark glass aesthetic with electric lime accent.
 * Shows: user stats overview, gamification badges, spending analytics, and settings.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../shared/context/AuthContext";
import { dashboardApi } from "../../shared/api/dashboard";
import { gamificationApi } from "../../shared/api/gamification";
import { intelligenceApi } from "../../shared/api/intelligence";
import type { ProfileStats, DashboardSummary, UserBadgesResponse } from "../../shared/types";

const LIME    = "#c3f400";
const LIME_DIM = "#abd600";
const CYAN    = "#00dce5";
const MANGO   = "#ffb86f";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } };

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const initial = user?.username?.charAt(0).toUpperCase() ?? "V";

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [badgesData, setBadgesData] = useState<UserBadgesResponse | null>(null);
  const [sharePricing, setSharePricing] = useState<boolean>(false);
  const [updatingPricing, setUpdatingPricing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [statsRes, sumRes, badgeRes] = await Promise.allSettled([
          dashboardApi.profileStats(),
          dashboardApi.summary(),
          gamificationApi.getBadges(),
        ]);
        if (cancelled) return;
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value);
          setSharePricing(!!statsRes.value.share_pricing_data);
        }
        if (sumRes.status === "fulfilled") {
          setSummary(sumRes.value.data);
        }
        if (badgeRes.status === "fulfilled") {
          setBadgesData(badgeRes.value);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleToggleSharePricing = async () => {
    const nextVal = !sharePricing;
    setUpdatingPricing(true);
    try {
      await intelligenceApi.toggleSharePricing(nextVal);
      setSharePricing(nextVal);
    } catch (err) {
      console.error("Failed to update pricing sharing:", err);
    } finally {
      setUpdatingPricing(false);
    }
  };

  const streakDays = badgesData?.current_streak_days ?? 0;
  const badges = badgesData?.badges ?? [];

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      {/* Radial shader */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(171,214,0,0.10) 0%, transparent 60%)" }}
      />

      <div className="page-container pt-20 pb-24 relative">
        {/* ── Profile Hero ── */}
        <motion.section className="mb-12 flex flex-col md:flex-row items-start md:items-center gap-6" {...fadeUp}>
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black flex-shrink-0"
            style={{
              background: "rgba(195,244,0,0.08)",
              border: `2px solid ${LIME}`,
              fontFamily: "'Syne', sans-serif",
              color: LIME,
              boxShadow: "4px 4px 0px #000",
            }}
          >
            {initial}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ fontFamily: "'Space Mono', monospace", color: LIME }}>
              Collector Profile
            </p>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
              {user?.username ?? "VANIQ USER"}
            </h1>
            <p className="mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
              {user?.email ?? ""}
            </p>
          </div>

          {/* Status badge & Streak */}
          <div className="md:ml-auto flex flex-col items-start md:items-end gap-2">
            <div
              className="px-4 py-2 rounded-full flex items-center gap-2 text-[11px] font-bold uppercase"
              style={{
                background: "rgba(195,244,0,0.08)",
                border: `1px solid ${LIME}30`,
                fontFamily: "'Space Mono', monospace",
                color: LIME,
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: LIME }} />
              {streakDays > 0 ? `${streakDays} Day Streak 🔥` : "Bazaar Scout"}
            </div>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
              {badgesData?.earned_count ?? 0} of {badgesData?.total_count ?? 0} Badges Unlocked
            </p>
          </div>
        </motion.section>

        {/* ── Analytics Overview ── */}
        <motion.section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-3" {...fadeUp} transition={{ delay: 0.1, duration: 0.6 }}>
          {[
            { label: "Total Hauls",   value: loading ? "—" : String(summary?.total_transactions ?? 0), icon: "receipt_long", color: LIME },
            { label: "Total Damage",  value: loading ? "—" : `₹${fmt(summary?.total_damage ?? 0)}`,    icon: "payments",     color: CYAN },
            { label: "Items Tracked", value: loading ? "—" : String(summary?.total_items ?? 0),       icon: "inventory_2",  color: MANGO },
            { label: "Price Alerts",  value: loading ? "—" : `${stats?.price_alerts_active ?? 0} High`, icon: "notifications",color: "#ffb4ab" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="glass-card p-5 flex flex-col gap-3"
              style={{ boxShadow: "4px 4px 0px #000" }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: stat.color }}>{stat.icon}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
                  {stat.label}
                </p>
                <p className="text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.section>

        {/* ── Gamification: Badges & Achievements ── */}
        <motion.section className="mb-12" {...fadeUp} transition={{ delay: 0.15, duration: 0.6 }}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ fontFamily: "'Space Mono', monospace", color: LIME }}>
                Collector Milestones
              </p>
              <h2 className="text-xl font-black uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                ACHIEVEMENTS & BADGES
              </h2>
            </div>
            <span
              className="text-xs font-mono font-bold px-3 py-1 rounded-full"
              style={{ background: "rgba(195,244,0,0.1)", color: LIME }}
            >
              {badgesData?.earned_count ?? 0}/{badgesData?.total_count ?? 0} SECURED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((b) => (
              <motion.div
                key={b.badge_key}
                className="glass-card p-5 flex flex-col justify-between relative overflow-hidden"
                style={{
                  border: b.earned ? "1px solid rgba(195,244,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  background: b.earned ? "rgba(195,244,0,0.04)" : "rgba(255,255,255,0.02)",
                  boxShadow: b.earned ? "3px 3px 0px #000" : "none",
                  opacity: b.earned ? 1 : 0.6,
                }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background: b.earned ? "rgba(195,244,0,0.15)" : "rgba(255,255,255,0.05)",
                      border: b.earned ? `1px solid ${LIME}` : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span>{b.icon || "🏆"}</span>
                  </div>
                  <div>
                    <h4
                      className="font-bold text-sm uppercase"
                      style={{ fontFamily: "'Syne', sans-serif", color: b.earned ? "#e2e4cf" : "#8e9379" }}
                    >
                      {b.name}
                    </h4>
                    <span
                      className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: b.earned ? "rgba(195,244,0,0.12)" : "rgba(255,255,255,0.08)",
                        color: b.earned ? LIME : "#8e9379",
                      }}
                    >
                      {b.earned ? "Earned" : "Locked"}
                    </span>
                  </div>
                </div>

                <p className="text-xs" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
                  {b.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Spending DNA ── */}
        <motion.section className="mb-12" {...fadeUp} transition={{ delay: 0.2, duration: 0.6 }}>
          <h2 className="text-xl font-black uppercase mb-5" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
            SPENDING DNA
          </h2>
          <div className="glass-card p-6">
            <div className="flex flex-col gap-5">
              {(stats?.spending_dna && stats.spending_dna.length > 0 ? stats.spending_dna : [
                { label: "Food & Produce",  pct: 82, color: LIME },
                { label: "Dairy & Staples", pct: 65, color: CYAN },
                { label: "Household Misc",  pct: 40, color: MANGO },
              ]).map((cat) => (
                <div key={cat.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold uppercase" style={{ fontFamily: "'Space Mono', monospace", color: "#c4c9ac" }}>
                      {cat.label}
                    </span>
                    <span className="text-sm font-black" style={{ fontFamily: "'Syne', sans-serif", color: cat.color }}>
                      {cat.pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: cat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.pct}%` }}
                      transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Settings & Privacy ── */}
        <motion.section {...fadeUp} transition={{ delay: 0.3, duration: 0.6 }}>
          <h2 className="text-xl font-black uppercase mb-5" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
            SETTINGS & PREFERENCES
          </h2>

          <div className="flex flex-col gap-2">
            {/* Crowdsourced Pricing Toggle */}
            <div className="glass-card p-5 flex items-center justify-between w-full" style={{ border: `1px solid ${CYAN}30` }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,220,229,0.08)" }}
                >
                  <span className="material-symbols-outlined text-xl" style={{ color: CYAN }}>hub</span>
                </div>
                <div>
                  <p className="font-black text-sm uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                    Crowdsourced Market Intelligence
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
                    Anonymously share pricing observations to power community market prices.
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleSharePricing}
                disabled={updatingPricing}
                className="w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5"
                style={{
                  background: sharePricing ? LIME : "rgba(255,255,255,0.15)",
                }}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-black shadow-md"
                  animate={{ x: sharePricing ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {[
              { icon: "person",          label: "Edit Profile",          desc: "Update name, email, avatar" },
              { icon: "notifications",   label: "Price Alerts",          desc: "Configure price drop notifications" },
              { icon: "download",        label: "Export Data",           desc: "Download your spending history" },
              { icon: "help_outline",    label: "Help & Support",        desc: "FAQs and contact" },
            ].map((item, i) => (
              <motion.button
                key={item.label}
                className="glass-card p-5 flex items-center justify-between w-full text-left group"
                whileHover={{ x: 4 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06, duration: 0.4 }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(195,244,0,0.06)" }}
                  >
                    <span className="material-symbols-outlined text-xl" style={{ color: LIME_DIM }}>{item.icon}</span>
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                      {item.label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform" style={{ color: "#8e9379" }}>
                  chevron_right
                </span>
              </motion.button>
            ))}

            {/* Sign out — red tinted */}
            <motion.button
              className="glass-card p-5 flex items-center justify-between w-full text-left mt-4 group"
              style={{ border: "1px solid rgba(255,180,171,0.15)" }}
              whileHover={{ x: 4, borderColor: "rgba(255,180,171,0.35)" }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              onClick={logout}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,180,171,0.08)" }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: "#ffb4ab" }}>logout</span>
                </div>
                <div>
                  <p className="font-black text-sm uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#ffb4ab" }}>
                    Sign Out
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
                    Exit your VANIQ session
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-base" style={{ color: "#ffb4ab" }}>chevron_right</span>
            </motion.button>
          </div>
        </motion.section>

        {/* Footer watermark */}
        <div className="mt-16 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ fontFamily: "'Space Mono', monospace", color: "#444933" }}>
            VANIQ v2.0 · Secure the Bag.
          </p>
        </div>
      </div>
    </div>
  );
}
