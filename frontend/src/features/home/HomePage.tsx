/**
 * HomePage — DailyBazaar (Vaniq)
 *
 * Modern green-themed Landing Page featuring:
 * 1. Animated Branding (Framer Motion)
 * 2. Big Scan Bill Button (Direct file picker / OCR trigger -> /confirm)
 * 3. Quick Secondary Actions (Notepad & Shopping List with draft badges)
 * 4. Statistics Section for logged-in users (Monthly spend + top frequent items chart)
 * 5. Recent Purchases (Compact summary)
 * 6. Publicity / Marketing Section (Why DailyBazaar?)
 * 7. Green-themed Footer with social media handles
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../shared/context/AuthContext";
import { dashboardApi } from "../../shared/api/dashboard";
import { transactionsApi } from "../../shared/api/transactions";
import type { DashboardSummary, TopItem, Transaction } from "../../shared/types";

import HeroSection from "./components/HeroSection";
import StatsCards from "./components/StatsCards";
import PublicitySection from "./components/PublicitySection";
import Footer from "./components/Footer";

/* ── Animation presets ── */
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
} as const;

/* ── Colour shortcuts ── */
const LIME = "#c3f400";
const SURFACE_CONTAINER = "#1e2113";
const SURFACE_CARD = "rgba(26, 31, 15, 0.75)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.14)";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.username?.split("_")[0] ?? "Shopper";

  /* ── State: pre-fill from persistent localStorage cache for instant (0ms) render ── */
  const fromCache = <T,>(key: string, fallback: T): T => {
    try {
      const c = localStorage.getItem("vaniq_home_cache_v2") || sessionStorage.getItem("vaniq_home_cache");
      return c ? (JSON.parse(c)[key] ?? fallback) : fallback;
    } catch {
      return fallback;
    }
  };

  const [summary, setSummary] = useState<DashboardSummary | null>(() => fromCache("summary", null));
  const [topItems, setTopItems] = useState<TopItem[]>(() => fromCache("top_items", []));
  const [recentHauls, setRecentHauls] = useState<Transaction[]>(() => fromCache("recent_hauls", []));
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !(localStorage.getItem("vaniq_home_cache_v2") || sessionStorage.getItem("vaniq_home_cache"));
    } catch {
      return true;
    }
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await dashboardApi.overview();
        if (cancelled) return;
        if (res.success && res.data) {
          const d = res.data;
          let items = d.top_items ?? [];
          let hauls = d.recent_hauls ?? [];

          // If overview did not include top_items or hauls, fetch in parallel
          if (items.length === 0 || hauls.length === 0) {
            const [topRes, txRes] = await Promise.allSettled([
              items.length === 0 ? dashboardApi.topItems() : Promise.resolve(null),
              hauls.length === 0 ? transactionsApi.list({ limit: 5 }) : Promise.resolve(null),
            ]);
            if (topRes.status === "fulfilled" && topRes.value?.data) {
              items = topRes.value.data;
            }
            if (txRes.status === "fulfilled" && txRes.value) {
              hauls = txRes.value;
            }
          }

          if (cancelled) return;
          if (d.summary) setSummary(d.summary);
          setTopItems(items);
          setRecentHauls(hauls);

          try {
            const cachedPayload = { ...d, top_items: items, recent_hauls: hauls };
            localStorage.setItem("vaniq_home_cache_v2", JSON.stringify(cachedPayload));
            sessionStorage.setItem("vaniq_home_cache", JSON.stringify(cachedPayload));
          } catch {}
          return;
        }
      } catch {
        try {
          const [sumRes, topRes, txRes] = await Promise.allSettled([
            dashboardApi.summary(),
            dashboardApi.topItems(),
            transactionsApi.list({ limit: 5 }),
          ]);
          if (cancelled) return;
          if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
          if (topRes.status === "fulfilled") setTopItems(topRes.value.data ?? []);
          if (txRes.status === "fulfilled") setRecentHauls(txRes.value ?? []);
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      {/* Subtle top gradient shader */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "45vh",
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(171,214,0,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="page-container pt-16 pb-24 relative z-10">
        {/* User Greeting (if logged in) */}
        {isAuthenticated && (
          <motion.div className="mb-2" {...fadeUp} transition={{ duration: 0.4 }}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                color: "#8e9379",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              {greeting()}
            </p>
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: "#e2e4cf",
              }}
            >
              {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
              <span style={{ color: LIME }}>.</span>
            </p>
          </motion.div>
        )}

        {/* 1. Hero Branding & Scan Bill Hub */}
        <HeroSection />

        {/* 2. Stats Section (for Logged-In Users) */}
        {isAuthenticated && (
          <StatsCards summary={summary} topItems={topItems} loading={loading} />
        )}

        {/* 3. Recent Purchases */}
        {isAuthenticated && (
          <motion.section className="mb-8" {...fadeUp} transition={{ delay: 0.1, duration: 0.45 }}>
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
                Recent Purchases
              </h2>
              <button
                onClick={() => navigate("/history")}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: LIME,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                View all →
              </button>
            </div>

            {recentHauls.length === 0 && !loading ? (
              <div
                className="glass-card p-6 rounded-2xl flex flex-col items-center gap-2 text-center"
                style={{
                  background: SURFACE_CARD,
                  border: `1px solid ${BORDER_COLOR}`,
                }}
              >
                <span className="material-symbols-outlined text-3xl" style={{ color: "#333627" }}>
                  receipt_long
                </span>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#8e9379" }}>
                  No hauls logged yet. Scan a bill to start tracking.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(loading ? [{}, {}, {}] : recentHauls.slice(0, 3)).map((haul, i) => {
                  const tx = haul as Transaction;
                  return (
                    <motion.div
                      key={loading ? i : tx.id}
                      className="glass-card p-3.5 rounded-xl flex items-center gap-3 cursor-pointer hover:border-[#c3f400]/40 transition-colors"
                      style={{
                        background: SURFACE_CARD,
                        border: `1px solid ${BORDER_COLOR}`,
                      }}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => !loading && navigate("/history")}
                    >
                      {loading ? (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
                          <div className="flex-1">
                            <div className="h-3 bg-white/5 rounded w-32 mb-2 animate-pulse" />
                            <div className="h-2 bg-white/5 rounded w-20 animate-pulse" />
                          </div>
                          <div className="h-4 bg-white/5 rounded w-14 animate-pulse" />
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              flexShrink: 0,
                              background: SURFACE_CONTAINER,
                              border: "1px solid rgba(195, 244, 0, 0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "'Syne', sans-serif",
                              fontWeight: 800,
                              fontSize: "11px",
                              color: LIME,
                            }}
                          >
                            {(tx.title || "Bill").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#e2e4cf",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tx.title}
                            </p>
                            <p
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "11px",
                                color: "#8e9379",
                                marginTop: "2px",
                              }}
                            >
                              {timeAgo(tx.created_at)}
                            </p>
                          </div>
                          <p
                            style={{
                              fontFamily: "'Syne', sans-serif",
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "#e2e4cf",
                              flexShrink: 0,
                              marginLeft: "8px",
                            }}
                          >
                            ₹{fmt(tx.total)}
                          </p>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}

        {/* 4. Publicity & Feature Highlights Section */}
        <PublicitySection />

        {/* 5. Footer */}
        <Footer />
      </div>
    </div>
  );
}
