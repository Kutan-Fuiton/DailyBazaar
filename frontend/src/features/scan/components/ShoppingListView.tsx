/**
 * ShoppingListView.tsx — Interactive Bazaar Shopping List & Planning module
 * Embedded directly inside ScanPage under the "BAZAAR PLANNING" tab.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shoppingListsApi } from "../../../shared/api/shoppingLists";
import type {
  ShoppingList,
  ParsedListItem,
} from "../../../shared/types";

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
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  color: CYAN,
                }}
              >
                Bazaar Check-off Mode
              </p>
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
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-sm text-white/70">
                close
              </span>
            </button>
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
              {finalizing
                ? "Finalizing…"
                : `💸 Finalize Haul (${boughtCount} Items · ₹${fmt(totalCalculated)})`}
            </button>
          )}
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
              className="flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-all"
              style={{
                background: mode === "TEXT" ? LIME : "transparent",
                color: mode === "TEXT" ? "#111508" : "#8e9379",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              ⚡ Quick Text Paste
            </button>
            <button
              onClick={() => setMode("MANUAL")}
              className="flex-1 py-1.5 text-xs font-bold uppercase rounded-lg transition-all"
              style={{
                background: mode === "MANUAL" ? LIME : "transparent",
                color: mode === "MANUAL" ? "#111508" : "#8e9379",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              📝 Item Builder
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
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400/20 text-amber-300 font-bold" title="Amount or price may be ambiguous">
                                ⚠️ check qty
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
