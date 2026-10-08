/**
 * ProfilePage — Vaniq Analytics, Past Hauls, Gamification & Household Sync
 * Dark glass aesthetic with electric lime accent.
 *
 * Integrated Sections:
 * - Collector Profile Hero with streak counter and user tag copy
 * - Tabbed Interface:
 *   1. "overview": Live Analytics, Spending DNA & Recent Haul previews
 *   2. "history": Complete Transaction History & All Hauls (empty state for onboarding, rename haul, details)
 *   3. "friends": Householders & Friends Sync via 8-digit user tag
 *   4. "badges": Collector Milestones & Gamification Achievements
 *   5. "settings": Crowdsourced Market Sharing, Export, & Sign Out
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { dashboardApi } from "../../shared/api/dashboard";
import { gamificationApi } from "../../shared/api/gamification";
import { intelligenceApi } from "../../shared/api/intelligence";
import { friendsApi } from "../../shared/api/friends";
import { transactionsApi } from "../../shared/api/transactions";
import type {
  ProfileStats,
  DashboardSummary,
  UserBadgesResponse,
  Friend,
  UserTagSearchResult,
  Transaction,
  TrendEntry,
} from "../../shared/types";
import {
  Flame,
  Copy,
  Check,
  UserPlus,
  Users,
  Search,
  Trash2,
  Receipt,
  Camera,
  ArrowRight,
  Edit2,
  X,
  Plus,
} from "lucide-react";

const LIME     = "#c3f400";
const LIME_DIM = "#abd600";
const CYAN     = "#00dce5";
const MANGO    = "#ffb86f";
const SC       = "#1e2113";

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };

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

type ProfileTab = "overview" | "history" | "friends" | "badges" | "settings";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab synchronized with URL param ?tab=history
  const urlTab = (searchParams.get("tab") as ProfileTab) || "overview";
  const [activeTab, setActiveTab] = useState<ProfileTab>(urlTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as ProfileTab;
    if (tabParam && ["overview", "history", "friends", "badges", "settings"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const switchTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams(tab === "overview" ? {} : { tab });
  };

  const initial = user?.username?.charAt(0).toUpperCase() ?? "V";

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [badgesData, setBadgesData] = useState<UserBadgesResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trends, setTrends] = useState<TrendEntry[]>([]);
  const [sharePricing, setSharePricing] = useState<boolean>(false);
  const [updatingPricing, setUpdatingPricing] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Transaction Renaming ──
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [renaming, setRenaming] = useState(false);

  // ── Friends & Tag State ──
  const [userTag, setUserTag] = useState<string>("");
  const [copiedTag, setCopiedTag] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTagInput, setSearchTagInput] = useState("");
  const [searchResult, setSearchResult] = useState<UserTagSearchResult | null>(null);
  const [searchingTag, setSearchingTag] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Baseline user info (loaded once on mount)
  useEffect(() => {
    let cancelled = false;
    async function loadBaseline() {
      try {
        const [tagRes, friendsRes] = await Promise.allSettled([
          friendsApi.getMyTag(),
          friendsApi.listFriends(),
        ]);
        if (cancelled) return;
        if (tagRes.status === "fulfilled" && tagRes.value?.tag) {
          setUserTag(tagRes.value.tag);
        }
        if (friendsRes.status === "fulfilled" && Array.isArray(friendsRes.value)) {
          setFriends(friendsRes.value);
        }
      } catch {}
    }
    loadBaseline();
    return () => { cancelled = true; };
  }, []);

  // Targeted tab-specific fetching (only fetch what is needed for the active view)
  useEffect(() => {
    let cancelled = false;
    async function loadTabData() {
      try {
        if (activeTab === "history") {
          const [txRes, sumRes] = await Promise.allSettled([
            transactionsApi.list({ limit: 50 }),
            dashboardApi.summary(),
          ]);
          if (cancelled) return;
          if (txRes.status === "fulfilled" && Array.isArray(txRes.value)) {
            setTransactions(txRes.value);
          }
          if (sumRes.status === "fulfilled") {
            setSummary(sumRes.value.data);
          }
        } else if (activeTab === "overview") {
          const [statsRes, sumRes, trRes] = await Promise.allSettled([
            dashboardApi.profileStats(),
            dashboardApi.summary(),
            dashboardApi.trends(),
          ]);
          if (cancelled) return;
          if (statsRes.status === "fulfilled") {
            setStats(statsRes.value);
            setSharePricing(!!statsRes.value.share_pricing_data);
          }
          if (sumRes.status === "fulfilled") {
            setSummary(sumRes.value.data);
          }
          if (trRes.status === "fulfilled" && Array.isArray(trRes.value?.data)) {
            setTrends(trRes.value.data);
          }
        } else if (activeTab === "badges") {
          const badgeRes = await gamificationApi.getBadges().catch(() => null);
          if (cancelled) return;
          if (badgeRes) setBadgesData(badgeRes);
        } else if (activeTab === "friends") {
          const friendsList = await friendsApi.listFriends().catch(() => []);
          if (cancelled) return;
          if (Array.isArray(friendsList)) setFriends(friendsList);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTabData();
    return () => { cancelled = true; };
  }, [activeTab]);

  const handleCopyTag = async () => {
    if (!userTag) return;
    try {
      await navigator.clipboard.writeText(`#${userTag}`);
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    } catch {}
  };

  const handleSearchTag = async () => {
    if (!searchTagInput.trim()) return;
    setSearchingTag(true);
    setSearchError(null);
    setSearchResult(null);
    setActionMsg(null);
    try {
      const res = await friendsApi.searchByTag(searchTagInput.trim());
      setSearchResult(res);
    } catch (err: any) {
      setSearchError(err?.message || "User not found with this tag");
    } finally {
      setSearchingTag(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;
    try {
      const res = await friendsApi.addFriend({ tag: searchResult.tag });
      setActionMsg(res.message);
      const updated = await friendsApi.listFriends();
      setFriends(updated);
      setSearchResult((prev) => prev ? { ...prev, is_friend: true } : null);
    } catch (err: any) {
      setSearchError(err?.message || "Failed to add friend");
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await friendsApi.removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (err: any) {
      console.error("Failed to remove friend:", err);
    }
  };

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

  const streakDays = badgesData?.current_streak_days ?? 0;
  const badges = badgesData?.badges ?? [];
  const maxBarAmount = Math.max(...trends.map((t) => t.amount), 1);

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      {/* Radial shader */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(171,214,0,0.10) 0%, transparent 60%)" }}
      />

      <div className="page-container pt-20 pb-24 relative max-w-5xl mx-auto px-4 sm:px-6">

        {/* ── Profile Hero ── */}
        <motion.section className="mb-8 flex flex-col md:flex-row items-start md:items-center gap-6" {...fadeUp}>
          {/* Avatar */}
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl font-black flex-shrink-0"
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
              {user?.username ?? "VANIQ USER"}
            </h1>
            <p className="mt-0.5 text-sm" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
              {user?.email ?? ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8e9379]" style={{ fontFamily: "'Space Mono', monospace" }}>
                TAG:
              </span>
              <button
                onClick={handleCopyTag}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#c3f400]/10 hover:bg-[#c3f400]/20 border border-[#c3f400]/30 text-xs font-mono font-bold text-[#c3f400] transition-colors"
                title="Click to copy your 8-digit tag"
              >
                <span>#{userTag || user?.tag || "DEMO2026"}</span>
                {copiedTag ? <Check className="w-3.5 h-3.5 text-lime-300" /> : <Copy className="w-3.5 h-3.5 opacity-80" />}
              </button>
            </div>
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
              {streakDays > 0 ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  <span>{streakDays} Day Streak</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: LIME }} />
                  <span>Bazaar Scout</span>
                </>
              )}
            </div>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
              {badgesData?.earned_count ?? 0} of {badgesData?.total_count ?? 0} Badges Unlocked
            </p>
          </div>
        </motion.section>

        {/* ── Sub-Navigation Tabs ── */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/10 no-scrollbar">
          {[
            { id: "overview" as ProfileTab, label: "Overview", icon: "dashboard" },
            { id: "history" as ProfileTab,  label: "Past Hauls", icon: "receipt_long", badge: transactions.length > 0 ? transactions.length : undefined },
            { id: "friends" as ProfileTab,  label: "Household & Friends", icon: "group", badge: friends.length > 0 ? friends.length : undefined },
            { id: "badges" as ProfileTab,   label: "Badges", icon: "emoji_events", badge: `${badgesData?.earned_count ?? 0}/${badgesData?.total_count ?? 0}` },
            { id: "settings" as ProfileTab, label: "Settings", icon: "tune" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
                  active
                    ? "bg-[#c3f400] text-[#0a0f04] shadow-[0_4px_16px_rgba(195,244,0,0.3)]"
                    : "bg-white/[0.03] hover:bg-white/[0.07] text-[#8e9379] hover:text-[#e2e4cf] border border-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      active ? "bg-black/20 text-black font-black" : "bg-white/10 text-[#c3f400]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════
            TAB 1: OVERVIEW
        ═══════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <motion.div {...fadeUp}>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Total Hauls",   value: loading ? "—" : String(summary?.total_transactions ?? 0), icon: "receipt_long", color: LIME },
                { label: "Total Damage",  value: loading ? "—" : `₹${fmt(summary?.total_damage ?? 0)}`,    icon: "payments",     color: CYAN },
                { label: "Items Tracked", value: loading ? "—" : String(summary?.total_items ?? 0),       icon: "inventory_2",  color: MANGO },
                { label: "Price Alerts",  value: loading ? "—" : `${stats?.price_alerts_active ?? 0} High`, icon: "notifications",color: "#ffb4ab" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card p-5 flex flex-col gap-2 rounded-2xl border border-white/10"
                  style={{ boxShadow: "4px 4px 0px #000" }}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ color: stat.color }}>{stat.icon}</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-mono text-[#8e9379]">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-black text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Hauls Section preview */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Recent Hauls
                </h3>
                <button
                  onClick={() => switchTab("history")}
                  className="text-xs font-mono font-bold text-[#c3f400] hover:underline flex items-center gap-1"
                >
                  <span>View All Hauls ({transactions.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                  <Receipt className="w-8 h-8 text-[#8e9379] mb-2" />
                  <p className="text-sm font-bold text-[#e2e4cf]">No hauls recorded yet</p>
                  <p className="text-xs text-[#8e9379] mt-1 max-w-sm mb-4">
                    Your purchase history will appear here once you scan a bill or mark off shopping list items.
                  </p>
                  <button
                    onClick={() => navigate("/scan")}
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ background: LIME, color: "#000" }}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan First Bill</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.slice(0, 3).map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => switchTab("history")}
                      className="glass-card p-4 rounded-xl border border-white/10 flex items-center justify-between hover:border-[#c3f400]/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black"
                          style={{ background: SC, color: LIME, fontFamily: "'Syne', sans-serif" }}
                        >
                          {tx.title.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#e2e4cf]">{tx.title}</p>
                          <div className="flex items-center gap-2 text-xs font-mono text-[#8e9379]">
                            <span>{timeAgo(tx.created_at)}</span>
                            <span>·</span>
                            <span>{tx.items?.length ?? 0} items</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-black text-[#c3f400]" style={{ fontFamily: "'Syne', sans-serif" }}>
                          ₹{fmt(tx.total)}
                        </p>
                        <span className="text-[10px] font-mono uppercase text-[#8e9379]">{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Spending DNA */}
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-black uppercase text-[#e2e4cf] mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
                Spending DNA
              </h3>
              <div className="flex flex-col gap-4">
                {(stats?.spending_dna && stats.spending_dna.length > 0 ? stats.spending_dna : [
                  { label: "Produce & Veggies", pct: 78, color: LIME },
                  { label: "Dairy & Eggs", pct: 60, color: CYAN },
                  { label: "Staples & Grains", pct: 45, color: MANGO },
                ]).map((cat) => (
                  <div key={cat.label}>
                    <div className="flex justify-between mb-1.5 text-xs font-mono">
                      <span className="font-bold text-[#c4c9ac]">{cat.label}</span>
                      <span className="font-black" style={{ color: cat.color }}>{cat.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB 2: PAST HAULS (TRANSACTION HISTORY)
        ═══════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <motion.div {...fadeUp}>
            {/* Header & Total damage summary */}
            <div className="glass-card p-6 rounded-2xl border border-white/10 mb-8" style={{ boxShadow: "4px 4px 0px #000" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-[#00dce5] mb-1">
                    Vault Summary
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Total Hauls Damage: ₹{fmt(summary?.total_damage ?? 0)}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/scan")}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ background: LIME, color: "#000" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Scan New Bill</span>
                  </button>
                </div>
              </div>

              {/* 7-Day spend bars */}
              {trends.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-mono text-[#8e9379] mb-2 tracking-wider">7-Day Spend Volume</p>
                  <div className="flex items-end gap-2 h-20">
                    {trends.map((bar, i) => {
                      const h = Math.max(6, (bar.amount / maxBarAmount) * 100);
                      const isToday = bar.date === new Date().toISOString().split("T")[0];
                      return (
                        <div key={i} className="flex-1 group relative flex flex-col items-center">
                          <div
                            className="absolute -top-7 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                            style={{ background: SC, color: LIME, fontFamily: "'Space Mono', monospace" }}
                          >
                            ₹{fmt(bar.amount)}
                          </div>
                          <div
                            className="w-full rounded-t-sm"
                            style={{
                              height: `${h}%`,
                              backgroundColor: isToday ? LIME : "rgba(195,244,0,0.2)",
                            }}
                          />
                          <span className="text-[9px] font-mono text-[#8e9379] mt-1">{bar.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Transactions List / Empty State */}
            {transactions.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#c3f400]/10 border border-[#c3f400]/25 text-[#c3f400] mb-3">
                  <Receipt className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase text-[#e2e4cf] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                  No Transaction History Yet
                </h3>
                <p className="max-w-md text-sm text-[#8e9379] mb-5">
                  You are ready to start! Capture a physical paper receipt with our OCR scanner, or complete a shopping list to log your first bazaar haul.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => navigate("/scan")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                    style={{ background: LIME, color: "#000" }}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan A Bill (OCR)</span>
                  </button>
                  <button
                    onClick={() => navigate("/shop")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                  >
                    <span>Create Shopping List</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono text-[#8e9379] px-1">
                  <span>Logged Hauls ({transactions.length})</span>
                  <span>Click haul to edit title</span>
                </div>

                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="glass-card p-4 sm:p-5 rounded-2xl border border-white/10 flex items-center justify-between hover:border-[#c3f400]/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: SC, color: LIME, fontFamily: "'Syne', sans-serif" }}
                      >
                        {tx.title.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        {editingTxId === tx.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              autoFocus
                              className="px-2.5 py-1 rounded-lg bg-black/50 border border-[#c3f400] text-sm text-[#e2e4cf] focus:outline-none"
                            />
                            <button
                              onClick={(e) => handleSaveRename(e, tx.id)}
                              disabled={renaming}
                              className="p-1.5 rounded-lg bg-[#c3f400] text-black text-xs font-bold"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingTxId(null); }}
                              className="p-1.5 rounded-lg bg-white/10 text-white text-xs"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-[#e2e4cf] truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                              {tx.title}
                            </h4>
                            <button
                              onClick={(e) => handleStartRename(e, tx)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#8e9379] hover:text-[#c3f400]"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1 text-xs font-mono text-[#8e9379] flex-wrap">
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase"
                            style={{
                              background: tx.status === "completed" ? "rgba(195,244,0,0.12)" : "rgba(255,184,111,0.12)",
                              color: tx.status === "completed" ? LIME_DIM : "#ffb86f",
                            }}
                          >
                            {tx.status}
                          </span>
                          <span>{timeAgo(tx.created_at)}</span>
                          <span>·</span>
                          <span>{tx.items?.length ?? 0} items</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right pl-3 flex-shrink-0">
                      <p className="text-lg sm:text-xl font-black text-[#c3f400]" style={{ fontFamily: "'Syne', sans-serif" }}>
                        ₹{fmt(tx.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB 3: HOUSEHOLD & FRIENDS
        ═══════════════════════════════════════════════ */}
        {activeTab === "friends" && (
          <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Search and invite card */}
            <div className="lg:col-span-5 glass-card p-6 rounded-2xl border border-[#c3f400]/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#c3f400]/10 text-[#c3f400]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Add Friend by Tag
                    </h3>
                    <p className="text-[11px] text-[#8e9379]">Connect friends for real-time shopping list sync</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#8e9379]">#</span>
                    <input
                      type="text"
                      value={searchTagInput}
                      onChange={(e) => setSearchTagInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearchTag(); }}
                      placeholder="e.g. DEMO2026"
                      maxLength={8}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-sm font-mono tracking-wider focus:outline-none focus:border-[#c3f400]/50"
                    />
                  </div>
                  <button
                    onClick={handleSearchTag}
                    disabled={searchingTag || !searchTagInput.trim()}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                    style={{ background: LIME, color: "#000" }}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{searchingTag ? "..." : "Find"}</span>
                  </button>
                </div>

                {searchError && (
                  <p className="mt-3 text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg p-2.5">
                    {searchError}
                  </p>
                )}

                {actionMsg && (
                  <p className="mt-3 text-xs text-lime-400 bg-lime-950/30 border border-lime-500/20 rounded-lg p-2.5">
                    {actionMsg}
                  </p>
                )}

                {searchResult && (
                  <div className="mt-4 p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#e2e4cf]">{searchResult.username}</p>
                      <p className="text-xs text-[#8e9379] font-mono">#{searchResult.tag}</p>
                    </div>
                    {searchResult.is_friend ? (
                      <span className="text-xs font-mono text-lime-400 px-2 py-1 bg-lime-400/10 rounded">Connected</span>
                    ) : (
                      <button
                        onClick={handleAddFriend}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 bg-[#c3f400] text-black hover:bg-[#abd600]"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-[#8e9379] font-mono">Your Invitation Tag</p>
                  <p className="text-sm font-mono font-bold text-[#c3f400]">#{userTag || user?.tag || "DEMO2026"}</p>
                </div>
                <button
                  onClick={handleCopyTag}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                >
                  {copiedTag ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTag ? "Copied" : "Copy Tag"}</span>
                </button>
              </div>
            </div>

            {/* Friends list card */}
            <div className="lg:col-span-7 glass-card p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#c3f400]" />
                  <h3 className="font-bold text-sm uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                    Connected Friends ({friends.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#8e9379] uppercase">Ready for List Sync</span>
              </div>

              {friends.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 mb-3">
                    <Users className="w-6 h-6 text-[#8e9379]" />
                  </div>
                  <p className="text-sm text-[#e2e4cf] font-bold">No householders or friends yet</p>
                  <p className="text-xs text-[#8e9379] mt-1 max-w-sm">
                    Share your tag <span className="font-mono text-[#c3f400]">#{userTag || "DEMO2026"}</span> with friends or search their tag on the left to start collaborating.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {friends.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-xl bg-white/5 hover:bg-white/[0.07] border border-white/10 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#c3f400]/10 border border-[#c3f400]/30 flex items-center justify-center text-sm font-bold text-[#c3f400] font-mono">
                          {f.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#e2e4cf]">{f.username}</p>
                          <div className="flex items-center gap-2 text-xs text-[#8e9379]">
                            <span className="font-mono text-[#c3f400]">#{f.tag || "--------"}</span>
                            {f.email && <span>· {f.email}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFriend(f.id)}
                        className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove Friend"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB 4: BADGES & ACHIEVEMENTS
        ═══════════════════════════════════════════════ */}
        {activeTab === "badges" && (
          <motion.div {...fadeUp}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-[#c3f400] mb-1">Collector Milestones</p>
                <h2 className="text-2xl font-black uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  ACHIEVEMENTS & BADGES
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#c3f400]/10 text-[#c3f400]">
                {badgesData?.earned_count ?? 0}/{badgesData?.total_count ?? 0} SECURED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((b) => (
                <div
                  key={b.badge_key}
                  className="glass-card p-5 rounded-2xl flex flex-col justify-between"
                  style={{
                    border: b.earned ? "1px solid rgba(195,244,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    background: b.earned ? "rgba(195,244,0,0.04)" : "rgba(255,255,255,0.02)",
                    opacity: b.earned ? 1 : 0.6,
                  }}
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
                      <h4 className="font-bold text-sm uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
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

                  <p className="text-xs text-[#8e9379] leading-relaxed">
                    {b.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
            TAB 5: SETTINGS & PRIVACY
        ═══════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <motion.div {...fadeUp}>
            <h2 className="text-xl font-black uppercase mb-5 text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
              SETTINGS & PREFERENCES
            </h2>

            <div className="flex flex-col gap-3">
              {/* Crowdsourced Pricing Toggle */}
              <div className="glass-card p-5 rounded-2xl flex items-center justify-between w-full border border-[#00dce5]/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00dce5]/10 text-[#00dce5]">
                    <span className="material-symbols-outlined text-xl">hub</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Crowdsourced Market Intelligence
                    </p>
                    <p className="text-xs text-[#8e9379] mt-0.5">
                      Anonymously share pricing observations to power community market benchmarks.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleSharePricing}
                  disabled={updatingPricing}
                  className="w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5"
                  style={{ background: sharePricing ? LIME : "rgba(255,255,255,0.15)" }}
                >
                  <motion.div
                    className="w-5 h-5 rounded-full bg-black shadow-md"
                    animate={{ x: sharePricing ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {[
                { icon: "person",        label: "Account Profile",       desc: `Username: ${user?.username} · Tag: #${userTag || user?.tag || 'DEMO2026'}` },
                { icon: "notifications", label: "Price Alerts",          desc: "Manage high-price threshold notifications" },
                { icon: "download",      label: "Export Spending Vault", desc: "Download all hauls and item statistics in JSON" },
                { icon: "help_outline",  label: "Help & Guide",          desc: "Bazaar scanning tips and FAQ" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="glass-card p-5 rounded-2xl flex items-center justify-between w-full border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#c3f400]/10 text-[#c3f400]">
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                        {item.label}
                      </p>
                      <p className="text-xs text-[#8e9379] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-base text-[#8e9379]">chevron_right</span>
                </div>
              ))}

              {/* Sign out */}
              <button
                onClick={logout}
                className="glass-card p-5 rounded-2xl flex items-center justify-between w-full border border-red-500/20 hover:border-red-500/40 transition-colors mt-3"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400">
                    <span className="material-symbols-outlined text-xl">logout</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm uppercase text-red-400" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Sign Out
                    </p>
                    <p className="text-xs text-[#8e9379] mt-0.5">End your active VANIQ session</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-base text-red-400">chevron_right</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Watermark */}
        <div className="mt-16 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] font-mono text-[#444933]">
            VANIQ v1.0 · Secure the Bag.
          </p>
        </div>
      </div>
    </div>
  );
}
