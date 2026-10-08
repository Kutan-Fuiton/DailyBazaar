import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { householdApi } from "../../shared/api/household";
import type {
  Household,
  HouseholdSummary,
  HouseholdSettlement,
} from "../../shared/types";
import { formatCurrency } from "../../shared/utils";
import Loader from "../../shared/components/Loader";
import { CheckCircle2 } from "lucide-react";

const LIME = "#c3f400";
const CYAN = "#00dce5";

export default function HouseholdPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [settlements, setSettlements] = useState<HouseholdSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Modal / Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchHouseholds = useCallback(async () => {
    try {
      setLoading(true);
      const data = await householdApi.listHouseholds();
      setHouseholds(data);
      if (data.length > 0) {
        setSelectedId((prev) => (prev ? prev : data[0].id));
      }
    } catch (err) {
      console.error("Failed to load households", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  const fetchDetails = useCallback(async (id: number) => {
    try {
      setDetailsLoading(true);
      const [sum, set] = await Promise.all([
        householdApi.getSummary(id),
        householdApi.getSettlements(id),
      ]);
      setSummary(sum);
      setSettlements(set);
    } catch (err) {
      console.error("Failed to load household details", err);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetails(selectedId);
    } else {
      setSummary(null);
      setSettlements(null);
    }
  }, [selectedId, fetchDetails]);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    try {
      const created = await householdApi.createHousehold(newHouseholdName.trim());
      setHouseholds((prev) => [...prev, created]);
      setSelectedId(created.id);
      setNewHouseholdName("");
      setShowCreateModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to create household");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !inviteIdentifier.trim()) return;
    try {
      setInviteLoading(true);
      setInviteMsg("");
      await householdApi.inviteMember(selectedId, inviteIdentifier.trim());
      setInviteMsg("Member added successfully!");
      setInviteIdentifier("");
      fetchDetails(selectedId);
      fetchHouseholds();
    } catch (err: any) {
      setInviteMsg(err.message || "Could not find or invite user");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "#111508", position: "relative" }}
    >
      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(195,244,0,0.08) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      <div className="page-container pt-20 pb-24 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.3em] mb-1 font-mono"
              style={{ color: LIME }}
            >
              Collaborative Finance
            </p>
            <h1
              className="text-4xl sm:text-6xl font-black uppercase italic"
              style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}
            >
              SHARED <span style={{ color: LIME }}>HOUSEHOLD</span>
            </h1>
            <p
              className="mt-2 text-sm max-w-lg"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#c4c9ac" }}
            >
              Split groceries, track shared pantry expenses, and auto-settle balances with flatmates or family.
            </p>
          </div>

          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.04, boxShadow: "0 6px 24px rgba(195,244,0,0.4)" }}
            whileTap={{ scale: 0.96 }}
            className="px-5 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto transition-all cursor-pointer"
            style={{
              background: LIME,
              color: "#111508",
              boxShadow: "0 4px 20px rgba(195,244,0,0.3)",
            }}
          >
            <span className="material-symbols-outlined text-base">group_add</span>
            New Household
          </motion.button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader
              variant="sync"
              title="Connecting Household Network…"
              subtitle="Streaming real-time shared shopping lists & members…"
            />
          </div>
        ) : households.length === 0 ? (
          /* Empty State */
          <div
            className="p-8 sm:p-12 rounded-3xl text-center max-w-2xl mx-auto"
            style={{
              background: "rgba(24,28,14,0.85)",
              border: "1px dashed rgba(195,244,0,0.3)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">home_work</span>
            </div>
            <h3
              className="text-2xl font-black uppercase text-white mb-2"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              No Households Yet
            </h3>
            <p className="text-sm text-[#8e9379] mb-6 max-w-md mx-auto">
              Create a shared household to track combined grocery spending, split expenses, and see who owes who in real-time.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3.5 rounded-xl bg-lime-400 text-[#111508] font-mono text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-lime-400/20"
            >
              Create Household
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left Sidebar: Household Selector */}
            <div className="w-full lg:w-72 space-y-2 flex-shrink-0">
              <p className="text-[10px] uppercase font-mono text-[#8e9379] tracking-wider mb-2">
                Your Households ({households.length})
              </p>
              {households.map((h) => {
                const isActive = h.id === selectedId;
                return (
                  <motion.button
                    key={h.id}
                    onClick={() => setSelectedId(h.id)}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden cursor-pointer"
                    style={{
                      background: isActive ? "rgba(195,244,0,0.12)" : "rgba(24,28,14,0.85)",
                      border: isActive
                        ? "1px solid rgba(195,244,0,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className="font-bold text-sm text-white truncate"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        {h.name}
                      </p>
                      <span className="text-xs text-lime-400 font-mono">
                        {h.members.length} {h.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Main Area: Household Details */}
            <div className="flex-1 w-full space-y-6">
              {detailsLoading ? (
                <div className="py-20 flex justify-center">
                  <Loader />
                </div>
              ) : summary ? (
                <>
                  {/* Top Stats Banner */}
                  <div
                    className="p-6 rounded-3xl grid grid-cols-1 sm:grid-cols-3 gap-4"
                    style={{
                      background: "rgba(24,28,14,0.85)",
                      border: "1px solid rgba(195,244,0,0.25)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <div>
                      <p className="text-[10px] font-mono uppercase text-[#8e9379] mb-1">
                        Total Combined Spend
                      </p>
                      <p
                        className="text-3xl font-black"
                        style={{ fontFamily: "'Syne', sans-serif", color: LIME }}
                      >
                        {formatCurrency(summary.total_spend)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-mono uppercase text-[#8e9379] mb-1">
                        Household Members
                      </p>
                      <p
                        className="text-3xl font-black text-white"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        {summary.members_count}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-mono uppercase text-[#8e9379] mb-1">
                        Unsettled Debt
                      </p>
                      <p
                        className="text-3xl font-black font-mono"
                        style={{
                          color:
                            settlements && settlements.total_unsettled_amount > 0
                              ? CYAN
                              : "#8e9379",
                        }}
                      >
                        {formatCurrency(settlements?.total_unsettled_amount || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Members & Net Balances */}
                  <div
                    className="p-6 rounded-3xl"
                    style={{
                      background: "rgba(24,28,14,0.85)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <h3
                      className="text-base font-black uppercase text-white mb-4 flex items-center gap-2"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      <span className="material-symbols-outlined text-lg text-lime-400">
                        account_balance
                      </span>
                      Member Balances
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {summary.member_breakdown.map((m) => (
                        <div
                          key={m.user_id}
                          className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-sm text-white">{m.username}</p>
                            <p className="text-[10px] font-mono text-white/40">
                              Paid: {formatCurrency(m.total_paid)} | Owed:{" "}
                              {formatCurrency(m.total_owed)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-sm font-black font-mono px-2.5 py-1 rounded-lg ${
                                m.net_balance > 0
                                  ? "bg-lime-400/10 text-lime-400 border border-lime-400/30"
                                  : m.net_balance < 0
                                  ? "bg-red-400/10 text-red-400 border border-red-400/30"
                                  : "bg-white/5 text-white/50"
                              }`}
                            >
                              {m.net_balance > 0
                                ? `+${formatCurrency(m.net_balance)}`
                                : formatCurrency(m.net_balance)}
                            </span>
                            <span className="block text-[9px] font-mono text-white/30 mt-0.5">
                              {m.net_balance > 0
                                ? "gets back"
                                : m.net_balance < 0
                                ? "owes"
                                : "settled"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settlements / Who Owes Whom */}
                  <div
                    className="p-6 rounded-3xl"
                    style={{
                      background: "rgba(24,28,14,0.85)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <h3
                      className="text-base font-black uppercase text-white mb-4 flex items-center gap-2"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      <span className="material-symbols-outlined text-lg text-cyan-400">
                        sync_alt
                      </span>
                      Debt Settlement Suggestions
                    </h3>

                    {settlements && settlements.settlements.length > 0 ? (
                      <div className="space-y-2">
                        {settlements.settlements.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{s.from_username}</span>
                              <span className="material-symbols-outlined text-sm text-cyan-400">
                                arrow_forward
                              </span>
                              <span className="font-bold text-white">{s.to_username}</span>
                            </div>
                            <span className="font-mono font-bold text-cyan-400 text-sm">
                              {formatCurrency(s.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/60 font-mono flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#c3f400] flex-shrink-0" />
                        <span>All debts are settled! No pending transfers required.</span>
                      </p>
                    )}
                  </div>

                  {/* Invite Member Section */}
                  <div
                    className="p-6 rounded-3xl"
                    style={{
                      background: "rgba(24,28,14,0.85)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <h3
                      className="text-base font-black uppercase text-white mb-2 flex items-center gap-2"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      <span className="material-symbols-outlined text-lg text-lime-400">
                        person_add
                      </span>
                      Invite Member
                    </h3>
                    <p className="text-xs text-[#8e9379] mb-4">
                      Add roommates, flatmates, or family members by their username or email.
                    </p>

                    <form onSubmit={handleInvite} className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        value={inviteIdentifier}
                        onChange={(e) => setInviteIdentifier(e.target.value)}
                        placeholder="Username or email…"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-lime-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={inviteLoading || !inviteIdentifier.trim()}
                        className="px-4 py-2.5 rounded-xl bg-lime-400 text-[#111508] font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-40"
                      >
                        {inviteLoading ? "Adding…" : "Invite"}
                      </button>
                    </form>

                    {inviteMsg && (
                      <p className="text-xs font-mono mt-2 text-white/80">{inviteMsg}</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Modal: Create Household */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div
              className="p-6 rounded-3xl max-w-md w-full border border-white/15"
              style={{ background: "#181c0e" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-black uppercase text-white"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  Create Household
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white/40 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateHousehold} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#8e9379] block mb-1.5">
                    Household Name
                  </label>
                  <input
                    type="text"
                    value={newHouseholdName}
                    onChange={(e) => setNewHouseholdName(e.target.value)}
                    placeholder="e.g. 4B Flatmates, Sharma Family"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium focus:border-lime-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newHouseholdName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-lime-400 text-[#111508] font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
