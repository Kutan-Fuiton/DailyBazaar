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
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function greetingEmoji() {
  const h = new Date().getHours();
  if (h < 5)  return "🌙";
  if (h < 12) return "☀️";
  if (h < 17) return "🌤️";
  if (h < 21) return "🌆";
  return "🌙";
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.username?.split("_")[0] ?? "Shopper";
  const capitalFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  /* ── State: strictly user-scoped cache to guarantee no data leaks between accounts ── */
  const userCacheKey = user?.id ? `vaniq_home_cache_u${user.id}` : null;

  const fromCache = <T,>(key: string, fallback: T): T => {
    if (!userCacheKey) return fallback;
    try {
      const c = localStorage.getItem(userCacheKey);
      return c ? (JSON.parse(c)[key] ?? fallback) : fallback;
    } catch {
      return fallback;
    }
  };

  const [summary, setSummary] = useState<DashboardSummary | null>(() => fromCache("summary", null));
  const [topItems, setTopItems] = useState<TopItem[]>(() => fromCache("top_items", []));
  const [recentHauls, setRecentHauls] = useState<Transaction[]>(() => fromCache("recent_hauls", []));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Purge legacy un-scoped cache keys that caused cross-user data bleeding
    try {
      localStorage.removeItem("vaniq_home_cache_v2");
      sessionStorage.removeItem("vaniq_home_cache");
    } catch {}

    if (!isAuthenticated || !user?.id) {
      setSummary(null);
      setTopItems([]);
      setRecentHauls([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const currentUserId = user.id;
    const key = `vaniq_home_cache_u${currentUserId}`;

    // Load from this user's specific cache if available
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.summary !== undefined) setSummary(parsed.summary);
        if (parsed.top_items !== undefined) setTopItems(parsed.top_items);
        if (parsed.recent_hauls !== undefined) setRecentHauls(parsed.recent_hauls);
      } else {
        setSummary(null);
        setTopItems([]);
        setRecentHauls([]);
      }
    } catch {
      setSummary(null);
      setTopItems([]);
      setRecentHauls([]);
    }

    setLoading(true);

    async function load() {
      try {
        const res = await dashboardApi.overview();
        if (cancelled) return;
        if (res.success && res.data) {
          const d = res.data;
          const items = d.top_items ?? [];
          const hauls = d.recent_hauls ?? [];

          setSummary(d.summary ?? null);
          setTopItems(items);
          setRecentHauls(hauls);

          try {
            const cachedPayload = { summary: d.summary, top_items: items, recent_hauls: hauls };
            localStorage.setItem(key, JSON.stringify(cachedPayload));
          } catch {}
          return;
        }
      } catch {
        if (cancelled) return;
        // On error or unauthorized, ensure clear state
        setSummary(null);
        setTopItems([]);
        setRecentHauls([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAuthenticated]);

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
          <motion.div className="mb-4" {...fadeUp} transition={{ duration: 0.4 }}>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#8e9379",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              {greeting()}
            </p>
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "24px",
                fontWeight: 800,
                color: "#e2e4cf",
                letterSpacing: "-0.02em",
              }}
            >
              {capitalFirst}<span style={{ color: LIME }}>.</span>
            </p>
          </motion.div>
        )}

        {/* Onboarding panel for brand-new users */}
        {isAuthenticated && !loading && (summary === null || (summary.total_transactions ?? 0) === 0) && (
          <motion.div
            className="mb-6 rounded-2xl p-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              background: "rgba(195,244,0,0.06)",
              border: "1px solid rgba(195,244,0,0.18)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(195,244,0,0.12)", fontSize: "22px" }}
              >
                {greetingEmoji()}
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#e2e4cf", marginBottom: "4px" }}>
                  Welcome to VANIQ, {capitalFirst}!
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8e9379", lineHeight: 1.6 }}>
                  Your smart bazaar finance tracker is set up. Start by scanning a bill or adding items to a shopping list.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    { label: "Scan a Bill",       icon: "document_scanner", path: "/scan" },
                    { label: "Create a List",     icon: "checklist",        path: "/shop" },
                    { label: "Browse Items",      icon: "inventory_2",      path: "/items" },
                  ].map((action) => (
                    <motion.button
                      key={action.label}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(action.path)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        background: "rgba(195,244,0,0.10)",
                        border: "1px solid rgba(195,244,0,0.22)",
                        color: LIME,
                      }}
                    >
                      <span className="material-symbols-outlined text-base" style={{ fontSize: "14px" }}>{action.icon}</span>
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
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
                onClick={() => navigate("/profile?tab=history")}
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
                      onClick={() => !loading && navigate("/profile?tab=history")}
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
