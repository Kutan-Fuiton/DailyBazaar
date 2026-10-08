/**
 * ShoppingListView.tsx — Interactive Bazaar Shopping List & Planning module
 * Embedded directly inside ScanPage under the "BAZAAR PLANNING" tab.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shoppingListsApi } from "../../../shared/api/shoppingLists";
import { friendsApi } from "../../../shared/api/friends";
import { useHouseholdSocket, type HouseholdWSEvent } from "../../../shared/hooks/useHouseholdSocket";
import type {
  ShoppingList,
  ParsedListItem,
  ShoppingListCollaborator,
  Friend,
} from "../../../shared/types";
import { Coins, Zap, FileText, AlertCircle, Users, UserPlus, Trash2 } from "lucide-react";

const LIME = "#c3f400";
const CYAN = "#00dce5";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

interface ShoppingListViewProps {
  onTransactionCreated?: () => void;
}

export default function ShoppingListView({
  onTransactionCreated,
}: ShoppingListViewProps) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ACTIVE");
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await shoppingListsApi.list();
      setLists(data);
      if (selectedList) {
        const updated = data.find((l) => l.id === selectedList.id);
        if (updated) setSelectedList(updated);
      }
    } catch (err) {
      console.error("Failed to load shopping lists:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedList]);

  useEffect(() => {
    loadLists();
  }, []);

  const filteredLists = lists.filter((l) => {
    if (filter === "ACTIVE") return l.status === "SAVED" || l.status === "SHOPPING";
    if (filter === "COMPLETED") return l.status === "COMPLETED" || l.status === "CANCELLED";
    return true;
  });

  const handleDeleteList = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this shopping list?")) return;
    setDeletingId(id);
    try {
      await shoppingListsApi.deleteList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      if (selectedList?.id === id) setSelectedList(null);
    } catch (err) {
      alert("Could not delete this list. Make sure it is not in active shopping status.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative z-10">
      {/* ── Subheader Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Pills — Modern Segmented Control */}
        <div
          className="p-1 rounded-xl flex items-center gap-1 bg-white/5 border border-white/10 shrink-0"
          style={{ backdropFilter: "blur(12px)" }}
        >
          {(["ACTIVE", "ALL", "COMPLETED"] as const).map((f) => {
            const isActive = filter === f;
            const label = f === "ACTIVE" ? "Active Lists" : f === "COMPLETED" ? "Past Lists" : "All Lists";
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap z-10"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  color: isActive ? "#111508" : "#8e9379",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeListFilterTab"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: LIME, boxShadow: "0 2px 10px rgba(195,244,0,0.3)" }}
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 font-bold">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Create List Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-xs self-start sm:self-auto transition-all"
          style={{
            background: LIME,
            color: "#111508",
            fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.04em",
            boxShadow: "3px 3px 0px #000",
          }}
        >
          <span className="material-symbols-outlined text-base">add</span>
          New Shopping List
        </button>
      </div>

      {/* ── Lists Grid / Empty State ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3)
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                className="glass-card p-6 flex flex-col gap-4"
                style={{ height: "180px" }}
              >
                <div className="w-1/2 h-5 skeleton rounded" />
                <div className="w-1/3 h-3 skeleton rounded" />
                <div className="w-full h-8 skeleton rounded mt-auto" />
              </div>
            ))}
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
          <span
            className="material-symbols-outlined text-5xl"
            style={{ color: "#444933", fontSize: "48px" }}
          >
            checklist
          </span>
          <div>
            <h3
              className="text-lg font-bold uppercase"
              style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}
            >
              No {filter.toLowerCase()} shopping lists
            </h3>
            <p
              className="text-sm mt-1"
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                color: "#8e9379",
              }}
            >
              Plan your next bazaar trip or write down groceries with natural text.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 rounded-full font-bold mt-2"
            style={{
              background: LIME,
              color: "#111508",
              fontFamily: "'Syne', sans-serif",
              fontSize: "13px",
            }}
          >
            + Create First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLists.map((list) => {
            const totalItems = list.items.length;
            const boughtItems = list.items.filter((i) => i.is_bought).length;
            const pct = totalItems > 0 ? Math.round((boughtItems / totalItems) * 100) : 0;
            const estimatedTotal = list.items.reduce(
              (acc, item) => acc + (item.user_price ?? item.suggested_price ?? 0) * (item.quantity || 1),
              0
            );

            const isDone = list.status === "COMPLETED";

            return (
              <motion.div
                key={list.id}
                layout
                {...fadeUp}
                onClick={() => setSelectedList(list)}
                className="glass-card p-5 flex flex-col justify-between group cursor-pointer relative"
                style={{
                  borderLeft: isDone
                    ? "3px solid #8e9379"
                    : list.status === "SHOPPING"
                    ? `3px solid ${CYAN}`
                    : `3px solid ${LIME}`,
                  boxShadow: "3px 3px 0px #000",
                }}
                whileHover={{ y: -3, boxShadow: "5px 5px 0px #000" }}
              >
                {/* Header */}
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3
                      className="font-black text-lg uppercase truncate"
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        color: "#e2e4cf",
                      }}
                    >
                      {list.title}
                    </h3>
                    <button
                      onClick={(e) => handleDeleteList(list.id, e)}
                      disabled={deletingId === list.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                      title="Delete List"
                    >
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: "#ffb4ab" }}
                      >
                        {deletingId === list.id ? "hourglass_empty" : "delete"}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] mb-4">
                    <span
                      className="px-2 py-0.5 rounded uppercase font-bold"
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        background:
                          list.status === "SHOPPING"
                            ? "rgba(0,220,229,0.15)"
                            : list.status === "COMPLETED"
                            ? "rgba(142,147,121,0.15)"
                            : "rgba(195,244,0,0.15)",
                        color:
                          list.status === "SHOPPING"
                            ? CYAN
                            : list.status === "COMPLETED"
                            ? "#c4c9ac"
                            : LIME,
                      }}
                    >
                      {list.status}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        color: "#8e9379",
                      }}
                    >
                      {timeAgo(list.created_at)}
                    </span>
                    {list.collaborators && list.collaborators.length > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 text-[9px]"
                        style={{
                          background: "rgba(195,244,0,0.12)",
                          color: LIME,
                        }}
                      >
                        <Users className="w-2.5 h-2.5" />
                        <span>{list.collaborators.length}</span>
                      </span>
                    )}
                    {list.is_owner === false && (
                      <span
                        className="px-1.5 py-0.5 rounded uppercase font-bold text-[9px]"
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          background: "rgba(0,220,229,0.15)",
                          color: CYAN,
                        }}
                      >
                        SHARED
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress & Items Info */}
                <div className="mt-2">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        color: "#c4c9ac",
                      }}
                    >
                      {boughtItems} / {totalItems} secured
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        color: pct === 100 ? LIME : "#8e9379",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background: isDone ? "#8e9379" : pct === 100 ? LIME : CYAN,
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span
                      className="text-[10px] uppercase"
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        color: "#8e9379",
                      }}
                    >
                      Est. Total
                    </span>
                    <span
                      className="font-bold text-sm"
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        color: LIME,
                      }}
                    >
                      ₹{fmt(estimatedTotal)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Active Checklist Modal / Drawer ── */}
      <AnimatePresence>
        {selectedList && (
          <ChecklistDrawer
            list={selectedList}
            onClose={() => setSelectedList(null)}
            onListUpdated={(updated) => {
              setSelectedList(updated);
              setLists((prev) =>
                prev.map((l) => (l.id === updated.id ? updated : l))
              );
            }}
            onFinalized={() => {
              setSelectedList(null);
              loadLists();
              if (onTransactionCreated) onTransactionCreated();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Create New List Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateListModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(newList) => {
              setShowCreateModal(false);
              setLists((prev) => [newList, ...prev]);
              setSelectedList(newList);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CHECKLIST DRAWER (BAZAAR CHECK-OFF & FINALIZE)
═════════════════════════════════════════════════════════════ */

interface ChecklistDrawerProps {
  list: ShoppingList;
  onClose: () => void;
  onListUpdated: (updated: ShoppingList) => void;
  onFinalized: () => void;
}

function ChecklistDrawer({
  list,
  onClose,
  onListUpdated,
  onFinalized,
}: ChecklistDrawerProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Collaborators & Householders State ──
  const [collaborators, setCollaborators] = useState<ShoppingListCollaborator[]>(list.collaborators || []);
  const [showHouseholdersModal, setShowHouseholdersModal] = useState(false);

  const loadCollaborators = useCallback(async () => {
    try {
      const collabs = await shoppingListsApi.getCollaborators(list.id);
      setCollaborators(collabs);
    } catch (err) {
      console.error("Failed to load collaborators:", err);
    }
  }, [list.id]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  // ── Real-time WebSocket synchronization ──
  const handleSocketEvent = useCallback((event: HouseholdWSEvent) => {
    if (event.type === "ITEM_ADDED" && event.data) {
      onListUpdated({
        ...list,
        items: list.items.some((i) => i.id === event.data.id) ? list.items : [...list.items, event.data as any],
      });
    } else if (event.type === "ITEM_TOGGLED" && event.data) {
      onListUpdated({
        ...list,
        items: list.items.map((i) => (i.id === event.data.id ? (event.data as any) : i)),
      });
    } else if (event.type === "ITEM_DELETED" && event.data?.item_id) {
      onListUpdated({
        ...list,
        items: list.items.filter((i) => i.id !== event.data.item_id),
      });
    } else if (event.type === "ALL_BOUGHT") {
      onListUpdated({
        ...list,
        items: list.items.map((i) => ({ ...i, is_bought: true })),
      });
    } else if (event.type === "COLLABORATOR_ADDED" || event.type === "COLLABORATOR_REMOVED") {
      loadCollaborators();
    }
  }, [list, onListUpdated, loadCollaborators]);

  const { isConnected } = useHouseholdSocket({
    listId: list.id,
    onEvent: handleSocketEvent,
  });

  const boughtCount = list.items.filter((i) => i.is_bought).length;
  const totalCount = list.items.length;

  const totalCalculated = list.items
    .filter((i) => i.is_bought)
    .reduce(
      (acc, i) => acc + (i.user_price ?? i.suggested_price ?? 0) * (i.quantity || 1),
      0
    );

  const handleToggle = async (itemId: number, currentStatus: boolean) => {
    try {
      const updatedItem = await shoppingListsApi.toggleBought(
        list.id,
        itemId,
        !currentStatus
      );
      const updatedList = {
        ...list,
        items: list.items.map((i) => (i.id === itemId ? updatedItem : i)),
      };
      onListUpdated(updatedList);
    } catch (err) {
      console.error("Failed to toggle item:", err);
    }
  };

  const handleMarkAll = async () => {
    try {
      const updated = await shoppingListsApi.markAllBought(list.id);
      onListUpdated(updated);
    } catch (err) {
      console.error("Failed to mark all bought:", err);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    setAddingItem(true);
    try {
      const created = await shoppingListsApi.addItem(list.id, {
        name: newItemName.trim(),
        quantity: parseFloat(newItemQty) || 1,
        unit: newItemUnit.trim() || undefined,
        user_price: parseFloat(newItemPrice) || undefined,
      });
      onListUpdated({
        ...list,
        items: [...list.items, created],
      });
      setNewItemName("");
      setNewItemQty("1");
      setNewItemUnit("");
      setNewItemPrice("");
    } catch (err) {
      console.error("Failed to add item:", err);
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await shoppingListsApi.deleteItem(list.id, itemId);
      onListUpdated({
        ...list,
        items: list.items.filter((i) => i.id !== itemId),
      });
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const handleFinalize = async () => {
    if (boughtCount === 0) {
      setError("Check off at least one item before finalizing.");
      return;
    }
    setError(null);
    setFinalizing(true);
    try {
      await shoppingListsApi.finalize(list.id, {
        title: list.title,
      });
      onFinalized();
    } catch (err: any) {
      setError(err?.message || "Failed to finalize haul.");
      setFinalizing(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed z-50 bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-4"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-hidden"
          style={{
            background: "#181c0e",
            border: "1px solid rgba(195,244,0,0.2)",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.8)",
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <p
                  className="text-[10px] uppercase tracking-widest"
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    color: CYAN,
                  }}
                >
                  Bazaar Check-off Mode
                </p>
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono"
                  style={{ color: isConnected ? LIME : "#8e9379" }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? "bg-lime-400 animate-pulse" : "bg-neutral-500"
                    }`}
                  />
                  <span>{isConnected ? "LIVE SYNC" : "CONNECTING"}</span>
                </div>
              </div>
              <h2
                className="text-2xl font-black uppercase mt-0.5"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  color: "#e2e4cf",
                }}
              >
                {list.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHouseholdersModal(true)}
                className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono font-bold uppercase transition-colors"
                style={{
                  background: "rgba(195,244,0,0.1)",
                  border: `1px solid ${LIME}40`,
                  color: LIME,
                }}
                title="Manage Householders for Live Sync"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Householders ({collaborators.length})</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-sm text-white/70">
                  close
                </span>
              </button>
            </div>
          </div>

          {/* Running Totals & Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="glass-card p-3">
              <span className="text-[9px] uppercase tracking-widest text-white/50 block font-mono">
                Items Checked
              </span>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "'Syne', sans-serif", color: LIME }}
              >
                {boughtCount} / {totalCount}
              </span>
            </div>
            <div className="glass-card p-3">
              <span className="text-[9px] uppercase tracking-widest text-white/50 block font-mono">
                Checked Total
              </span>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "'Syne', sans-serif", color: CYAN }}
              >
                ₹{fmt(totalCalculated)}
              </span>
            </div>
            <div className="glass-card p-3 col-span-2 sm:col-span-1 flex items-center justify-center">
              {list.status !== "COMPLETED" && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg w-full"
                  style={{
                    background: "rgba(195,244,0,0.1)",
                    color: LIME,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  Mark All Checked
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Item Checklist */}
          <div
            className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5"
            style={{ maxHeight: "320px" }}
          >
            {list.items.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">
                No items in this list yet. Add some below!
              </div>
            ) : (
              list.items.map((item) => {
                const itemPrice =
                  (item.user_price ?? item.suggested_price ?? 0) *
                  (item.quantity || 1);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer"
                    style={{
                      background: item.is_bought
                        ? "rgba(195,244,0,0.08)"
                        : "rgba(255,255,255,0.03)",
                      border: item.is_bought
                        ? "1px solid rgba(195,244,0,0.25)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                    onClick={() => handleToggle(item.id, item.is_bought)}
                  >
                    {/* Big Checkbox */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: item.is_bought ? LIME : "rgba(255,255,255,0.08)",
                          border: item.is_bought ? "none" : "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        {item.is_bought && (
                          <span
                            className="material-symbols-outlined text-base font-black"
                            style={{ color: "#111508" }}
                          >
                            check
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className="font-bold text-sm uppercase truncate"
                          style={{
                            fontFamily: "'Syne', sans-serif",
                            color: item.is_bought ? "#e2e4cf" : "#c4c9ac",
                            textDecoration: item.is_bought ? "line-through" : "none",
                          }}
                        >
                          {item.name}
                        </p>
                        <p
                          className="text-[10px] tracking-wider"
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            color: "#8e9379",
                          }}
                        >
                          {item.quantity} {item.unit || "units"}
                        </p>
                      </div>
                    </div>

                    {/* Price & Delete */}
                    <div
                      className="flex items-center gap-3 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className="font-bold text-sm"
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          color: item.is_bought ? LIME : "#c4c9ac",
                        }}
                      >
                        ₹{fmt(itemPrice)}
                      </span>

                      {list.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">
                            close
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Inline Row (Only for non-completed lists) */}
          {list.status !== "COMPLETED" && (
            <div className="flex gap-2 items-center pt-3 border-t border-white/10">
              <input
                type="text"
                placeholder="Item name (e.g. Tomato)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white"
                style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
              />
              <input
                type="number"
                placeholder="Qty"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="w-14 px-2 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white text-center"
              />
              <input
                type="text"
                placeholder="Unit"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-16 px-2 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white text-center"
              />
              <button
                onClick={handleAddItem}
                disabled={addingItem || !newItemName.trim()}
                className="px-3.5 py-2 rounded-lg text-xs uppercase font-bold"
                style={{
                  background: LIME,
                  color: "#111508",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                +
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Finalize Button */}
          {list.status !== "COMPLETED" && (
            <button
              onClick={handleFinalize}
              disabled={finalizing || boughtCount === 0}
              className="w-full py-3.5 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2"
              style={{
                background: boughtCount > 0 ? LIME : "rgba(255,255,255,0.08)",
                color: boughtCount > 0 ? "#111508" : "rgba(255,255,255,0.3)",
                fontFamily: "'Syne', sans-serif",
                boxShadow: boughtCount > 0 ? "3px 3px 0px #000" : "none",
                cursor: boughtCount > 0 ? "pointer" : "not-allowed",
              }}
            >
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              {finalizing ? (
                "Finalizing…"
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  Finalize Haul ({boughtCount} Items · ₹{fmt(totalCalculated)})
                </span>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Householders Modal */}
      <AnimatePresence>
        {showHouseholdersModal && (
          <HouseholdersModal
            listId={list.id}
            isOwner={list.is_owner !== false}
            onClose={() => setShowHouseholdersModal(false)}
            onCollaboratorsChanged={loadCollaborators}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   HOUSEHOLDERS MODAL (REALTIME LIST COLLABORATORS & FRIENDS)
═════════════════════════════════════════════════════════════ */

interface HouseholdersModalProps {
  listId: number;
  isOwner?: boolean;
  onClose: () => void;
  onCollaboratorsChanged: () => void;
}

function HouseholdersModal({
  listId,
  isOwner = true,
  onClose,
  onCollaboratorsChanged,
}: HouseholdersModalProps) {
  const [collaborators, setCollaborators] = useState<ShoppingListCollaborator[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [searchingTag, setSearchingTag] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [collabs, friendsList] = await Promise.all([
        shoppingListsApi.getCollaborators(listId),
        friendsApi.listFriends(),
      ]);
      setCollaborators(collabs);
      setFriends(friendsList);
    } catch (err: any) {
      console.error("Failed to load collaborators/friends:", err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddFriend = async (friend: Friend) => {
    setActionId(friend.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await shoppingListsApi.addCollaborator(listId, { user_id: friend.id });
      setSuccessMsg(`Added ${friend.username} to this list!`);
      await loadData();
      onCollaboratorsChanged();
    } catch (err: any) {
      setErrorMsg(err?.message || `Failed to add ${friend.username}`);
    } finally {
      setActionId(null);
    }
  };

  const handleAddByTag = async () => {
    if (!tagInput.trim()) return;
    setSearchingTag(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await friendsApi.searchByTag(tagInput.trim());
      await shoppingListsApi.addCollaborator(listId, { user_id: user.id });
      setSuccessMsg(`Added ${user.username} (#${user.tag}) to this list!`);
      setTagInput("");
      await loadData();
      onCollaboratorsChanged();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to add user with this tag");
    } finally {
      setSearchingTag(false);
    }
  };

  const handleRemoveCollaborator = async (userId: number, username: string) => {
    setActionId(userId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await shoppingListsApi.removeCollaborator(listId, userId);
      setSuccessMsg(`Removed ${username} from this list`);
      await loadData();
      onCollaboratorsChanged();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to remove collaborator");
    } finally {
      setActionId(null);
    }
  };

  const availableFriends = friends.filter(
    (f) => !collaborators.some((c) => c.user_id === f.id)
  );

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        <div
          className="pointer-events-auto w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
          style={{
            background: "#181c0e",
            border: "1px solid rgba(195,244,0,0.3)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(195,244,0,0.12)" }}
              >
                <Users className="w-5 h-5" style={{ color: LIME }} />
              </div>
              <div>
                <h3
                  className="text-lg font-black uppercase text-[#e2e4cf]"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  List Householders
                </h3>
                <p className="text-[11px] text-[#8e9379]">
                  Live real-time sync with added householders
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-lime-950/40 border border-lime-500/30 text-xs text-lime-300">
              {successMsg}
            </div>
          )}

          {/* Current Householders */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-[#8e9379]">
                Active Members ({collaborators.length})
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-[#8e9379] py-3">Loading householders...</p>
            ) : collaborators.length === 0 ? (
              <p className="text-xs text-[#8e9379] py-2">
                No extra householders on this list yet.
              </p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div
                    key={c.user_id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
                        style={{
                          background: "rgba(195,244,0,0.15)",
                          color: LIME,
                        }}
                      >
                        {c.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#e2e4cf]">{c.username}</p>
                        <span className="text-[10px] font-mono text-[#c3f400]">
                          #{c.tag || "--------"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#c4c9ac",
                        }}
                      >
                        {c.role}
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveCollaborator(c.user_id, c.username)}
                          disabled={actionId === c.user_id}
                          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove collaborator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add from Connected Friends */}
          <div className="pt-3 border-t border-white/10">
            <span className="text-[10px] uppercase tracking-wider font-mono text-[#8e9379] block mb-2.5">
              Add from Connected Friends
            </span>

            {availableFriends.length === 0 ? (
              <p className="text-xs text-[#8e9379] italic">
                {friends.length === 0
                  ? "No friends connected yet. Connect with friends in your Profile using their 8-character tag!"
                  : "All your connected friends are already added to this list."}
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {availableFriends.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white font-mono">
                        {f.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#e2e4cf]">{f.username}</p>
                        <p className="text-[10px] font-mono text-[#c3f400]">#{f.tag}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFriend(f)}
                      disabled={actionId === f.id}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 bg-[#c3f400] text-black hover:bg-[#abd600] disabled:opacity-50"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>{actionId === f.id ? "Adding..." : "Add"}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Or Add by 8-Digit Tag */}
          <div className="pt-3 border-t border-white/10">
            <span className="text-[10px] uppercase tracking-wider font-mono text-[#8e9379] block mb-2">
              Or Add Directly by 8-Digit Tag
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#8e9379]">#</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddByTag(); }}
                  placeholder="e.g. DEMO2026"
                  maxLength={8}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 text-xs font-mono tracking-wider focus:outline-none focus:border-[#c3f400]/50"
                />
              </div>
              <button
                onClick={handleAddByTag}
                disabled={searchingTag || !tagInput.trim()}
                className="px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                style={{ background: LIME, color: "#000" }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{searchingTag ? "..." : "Add"}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   CREATE NEW SHOPPING LIST MODAL (NATURAL TEXT + MANUAL)
═════════════════════════════════════════════════════════════ */

interface CreateListModalProps {
  onClose: () => void;
  onCreated: (list: ShoppingList) => void;
}

function CreateListModal({ onClose, onCreated }: CreateListModalProps) {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"TEXT" | "MANUAL">("TEXT");
  const [rawText, setRawText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedListItem[]>([]);
  const [manualItems, setManualItems] = useState<
    { name: string; quantity: string; unit: string; price: string }[]
  >([{ name: "", quantity: "1", unit: "kg", price: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced parse of natural text
  useEffect(() => {
    if (mode !== "TEXT" || !rawText.trim()) {
      setParsedPreview([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await shoppingListsApi.parseText(rawText);
        setParsedPreview(res.items);
      } catch (err) {
        console.error("Text parse error:", err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [rawText, mode]);

  const handleAddManualRow = () => {
    setManualItems((prev) => [
      ...prev,
      { name: "", quantity: "1", unit: "kg", price: "" },
    ]);
  };

  const handleSave = async () => {
    const listTitle = title.trim() || "Bazaar Shopping List";
    setSaving(true);
    setError(null);

    try {
      let itemsToCreate: any[] = [];
      if (mode === "TEXT") {
        const sourceItems = parsedPreview.length > 0 ? parsedPreview : (rawText.trim() ? (await shoppingListsApi.parseText(rawText)).items : []);
        itemsToCreate = sourceItems.map((i) => ({
          name: i.name,
          quantity: i.quantity || 1,
          unit: i.unit || i.suggested_unit || undefined,
          user_price: i.price ?? i.suggested_price ?? undefined,
          source: "NATURAL_TEXT",
        }));
      } else {
        itemsToCreate = manualItems
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            quantity: parseFloat(i.quantity) || 1,
            unit: i.unit.trim() || undefined,
            user_price: parseFloat(i.price) || undefined,
            source: "MANUAL",
          }));
      }

      const created = await shoppingListsApi.create({
        title: listTitle,
        items: itemsToCreate,
      });

      onCreated(created);
    } catch (err: any) {
      setError(err?.message || "Failed to create list.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed z-50 bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-4"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          style={{
            background: "#181c0e",
            border: "1px solid rgba(195,244,0,0.2)",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.8)",
          }}
        >
          <div className="flex justify-between items-center">
            <h2
              className="text-xl font-black uppercase"
              style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}
            >
              New Shopping List
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5"
            >
              <span className="material-symbols-outlined text-sm text-white/70">
                close
              </span>
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label
              className="text-[10px] uppercase tracking-widest text-white/50 block mb-1"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              List Title
            </label>
            <input
              type="text"
              placeholder="e.g. Sunday Morning Bazaar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setMode("TEXT")}
              className="flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
              style={{
                background: mode === "TEXT" ? LIME : "transparent",
                color: mode === "TEXT" ? "#111508" : "#8e9379",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              Quick Text Paste
            </button>
            <button
              onClick={() => setMode("MANUAL")}
              className="flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
              style={{
                background: mode === "MANUAL" ? LIME : "transparent",
                color: mode === "MANUAL" ? "#111508" : "#8e9379",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              <FileText className="w-3.5 h-3.5" />
              Item Builder
            </button>
          </div>

          {/* Mode 1: Natural Text Input */}
          {mode === "TEXT" && (
            <div className="flex flex-col gap-3">
              <div>
                <label
                  className="text-[10px] uppercase tracking-widest text-white/50 block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Type / Paste Items (one per line)
                </label>
                <textarea
                  rows={4}
                  placeholder={`alu 1kg\npeyaj 500g\nmilk 2 packets\npaneer 200g 90\neggs 12`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono leading-relaxed"
                />
              </div>

              {/* Parsed Live Preview */}
              {parsedPreview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] uppercase tracking-widest text-white/50"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      Smart Parsed Preview ({parsedPreview.length} items)
                    </span>
                    <span className="text-[10px] font-mono text-lime-400 font-bold">
                      Est. Total: ₹{fmt(parsedPreview.reduce((sum, i) => sum + (i.price ?? i.suggested_price ?? 0) * (i.quantity || 1), 0))}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 p-2 bg-white/5 rounded-xl border border-white/10">
                    {parsedPreview.map((item, idx) => {
                      const displayPrice = item.price ?? item.suggested_price;
                      return (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-lg text-xs bg-white/10 text-white flex items-center justify-between font-mono"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span>{item.emoji || "🛒"}</span>
                            <span className="font-bold truncate" style={{ color: LIME }}>{item.name}</span>
                            <span className="text-white/50 text-[11px]">
                              {item.quantity ? `${item.quantity} ${item.unit || "units"}` : "(qty not specified)"}
                            </span>
                            {item.confidence === "low" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400/20 text-amber-300 font-bold inline-flex items-center gap-1" title="Amount or price may be ambiguous">
                                <AlertCircle className="w-2.5 h-2.5" /> check qty
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.price != null ? (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-lime-400/20 text-lime-300 font-bold">
                                ₹{item.price} (typed)
                              </span>
                            ) : item.market_price != null ? (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300" title="Crowdsourced market benchmark">
                                ~₹{item.market_price} (market)
                              </span>
                            ) : item.user_last_price != null ? (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-white/70" title="Your last purchase price">
                                ₹{item.user_last_price} (prev)
                              </span>
                            ) : displayPrice != null ? (
                              <span className="text-[11px] text-white/50">
                                ~₹{displayPrice}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Manual Builder */}
          {mode === "MANUAL" && (
            <div className="flex flex-col gap-2">
              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                {manualItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => {
                        const next = [...manualItems];
                        next[idx].name = e.target.value;
                        setManualItems(next);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...manualItems];
                        next[idx].quantity = e.target.value;
                        setManualItems(next);
                      }}
                      className="w-16 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(e) => {
                        const next = [...manualItems];
                        next[idx].unit = e.target.value;
                        setManualItems(next);
                      }}
                      className="w-16 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddManualRow}
                className="text-xs uppercase font-bold text-left text-lime-400 py-1 font-mono"
              >
                + Add Another Row
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-black uppercase text-sm mt-2"
            style={{
              background: LIME,
              color: "#111508",
              fontFamily: "'Syne', sans-serif",
              boxShadow: "3px 3px 0px #000",
            }}
          >
            {saving ? "Saving List…" : "Save Shopping List"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
