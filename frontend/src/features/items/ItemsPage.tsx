/**
 * ItemsPage — Vaniq Item Catalogue (Live API)
 *
 * Shows:
 * - "INVENTORY" header + Add Item button
 * - Category filter chips (derived from live data)
 * - Item cards grid (live from /items)
 * - Add Item modal (POST /items)
 * - Delete item (DELETE /items/:id)
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { itemsApi } from "../../shared/api/items";
import type { Item, ItemCreate, GlobalCatalogItem } from "../../shared/types";
import ItemDetailDrawer from "./ItemDetailDrawer";
import ItemAutocomplete from "./components/ItemAutocomplete";

const LIME     = "#c3f400";
const CYAN     = "#00dce5";
const MANGO    = "#ffb86f";
const SC       = "#1e2113";

const EMOJI_OPTIONS = ["🛒","🍅","🥑","🧅","🥛","🍞","🥚","🧄","🫑","🫐","🍋","🍇","🥩","🐟","🧀","🫙","🥜","🌾","🫒","🍯"];

export default function ItemsPage() {
  const [items,          setItems]          = useState<Item[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showModal,      setShowModal]      = useState(false);
  const [deleting,       setDeleting]       = useState<number | null>(null);
  const [selectedItem,   setSelectedItem]   = useState<Item | null>(null);
  const [searchQuery,    setSearchQuery]    = useState("");

  // ── Global Catalog State ──
  const [activeTab,      setActiveTab]      = useState<"INVENTORY" | "GLOBAL">("INVENTORY");
  const [globalItems,    setGlobalItems]    = useState<GlobalCatalogItem[]>([]);
  const [globalLoading,  setGlobalLoading]  = useState(false);
  const [globalSearch,   setGlobalSearch]   = useState("");
  const [importingId,    setImportingId]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await itemsApi.list();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGlobal = useCallback(async (query: string = "") => {
    setGlobalLoading(true);
    try {
      const data = await itemsApi.listGlobal(query);
      setGlobalItems(data);
    } catch (e) {
      console.error("Failed to load global catalog:", e);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === "GLOBAL") {
      const timer = setTimeout(() => loadGlobal(globalSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, globalSearch, loadGlobal]);

  const handleImportFromGlobal = async (entry: GlobalCatalogItem) => {
    setImportingId(entry.id);
    try {
      const imported = await itemsApi.importFromGlobal(entry.id);
      setItems((prev) => [imported, ...prev.filter((i) => i.id !== imported.id)]);
      alert(`✅ Added "${entry.name}" to your inventory with tag "Not Bought Yet"!`);
    } catch (err: any) {
      alert(err?.message || "Failed to add item to inventory");
    } finally {
      setImportingId(null);
    }
  };

  // Derive categories from actual data
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category ?? "Other").filter(Boolean))).sort()];

  const filtered = items.filter((i) => {
    const matchesCat = activeCategory === "All" || (i.category ?? "Other") === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.category?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      i.aliases?.some((a) => a.alias.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await itemsApi.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleSeedStaples = async () => {
    const staples = [
      { name: "Potato", emoji: "🥔", category: "Vegetables", unit: "kg", price_per_unit: 25 },
      { name: "Onion", emoji: "🧅", category: "Vegetables", unit: "kg", price_per_unit: 35 },
      { name: "Milk", emoji: "🥛", category: "Dairy", unit: "L", price_per_unit: 62 },
    ];
    setLoading(true);
    try {
      for (const s of staples) {
        await itemsApi.create(s);
      }
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(171,214,0,0.10) 0%, transparent 60%)" }}
      />

      <div className="page-container pt-20 pb-24 relative">

        {/* ── Header ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] mb-2 font-mono" style={{ color: LIME }}>
            Your Bazaar Intelligence
          </p>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-5xl md:text-7xl font-black uppercase italic" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                INVENTORY
              </h1>
              <p className="mt-1 text-sm font-sans" style={{ color: "#8e9379" }}>
                {loading ? "Loading…" : `${items.length} items in your personal catalog`}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full font-bold self-start md:self-auto transition-transform active:scale-95"
              style={{
                background: LIME,
                color: "#1a2200",
                fontFamily: "'Syne', sans-serif",
                fontSize: "13px",
                letterSpacing: "0.04em",
                boxShadow: "0 4px 20px rgba(195,244,0,0.3), 4px 4px 0px rgba(0,0,0,0.7)",
                border: "2px solid rgba(0,0,0,0.5)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px", lineHeight: 1 }}>add</span>
              Add Custom Item
            </button>
          </div>

          {/* Tab Switcher: My Inventory vs Global Catalog */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mt-6 max-w-md">
            <button
              onClick={() => setActiveTab("INVENTORY")}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              style={{
                background: activeTab === "INVENTORY" ? LIME : "transparent",
                color: activeTab === "INVENTORY" ? "#111508" : "#8e9379",
                fontFamily: "'Syne', sans-serif",
                boxShadow: activeTab === "INVENTORY" ? "3px 3px 0px #000" : "none",
              }}
            >
              <span className="material-symbols-outlined text-base">inventory_2</span>
              My Inventory ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("GLOBAL")}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              style={{
                background: activeTab === "GLOBAL" ? LIME : "transparent",
                color: activeTab === "GLOBAL" ? "#111508" : "#8e9379",
                fontFamily: "'Syne', sans-serif",
                boxShadow: activeTab === "GLOBAL" ? "3px 3px 0px #000" : "none",
              }}
            >
              <span className="material-symbols-outlined text-base">public</span>
              Global Catalog
            </button>
          </div>
        </motion.div>

        {/* ── VIEW 1: MY PERSONAL INVENTORY ── */}
        {activeTab === "INVENTORY" && (
          <div>
            {/* ── Search & Autocomplete Bar ── */}
            <div className="mb-6 max-w-md">
              <ItemAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={(item) => setSelectedItem(item)}
                items={items}
                placeholder="Search items, categories, or aliases…"
              />
            </div>

            {/* ── Category Chips ── */}
            <motion.div
              className="flex gap-2 flex-wrap mb-8"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all font-mono"
                  style={{
                    background: activeCategory === cat ? LIME : "rgba(255,255,255,0.05)",
                    color: activeCategory === cat ? "#283500" : "#c4c9ac",
                    border: activeCategory === cat ? "2px solid #000" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: activeCategory === cat ? "3px 3px 0px #000" : "none",
                  }}
                >
                  {cat}
                </button>
              ))}
            </motion.div>


        {/* ── Items Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(null).map((_, i) => (
              <div key={i} className="glass-card p-6 flex flex-col gap-4" style={{ boxShadow: "4px 4px 0px #000" }}>
                <div className="w-full aspect-square rounded-xl skeleton" />
                <div className="h-4 skeleton rounded w-2/3" />
                <div className="h-3 skeleton rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 sm:p-16 flex flex-col items-center gap-4 text-center max-w-lg mx-auto">
            <span className="material-symbols-outlined" style={{ fontSize: "52px", color: "#444933" }}>inventory_2</span>
            <p style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf", fontSize: "18px", fontWeight: 700 }}>
              {activeCategory === "All" ? "No items found" : `No ${activeCategory} items`}
            </p>
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}>
              {activeCategory === "All"
                ? "Add your first item or quick-start with common household staples."
                : "Try adjusting your search or category filter."}
            </p>
            {activeCategory === "All" && (
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-5 py-2.5 rounded-full font-bold text-xs"
                  style={{
                    background: LIME,
                    color: "#1a2200",
                    fontFamily: "'Syne', sans-serif",
                    boxShadow: "4px 4px 0px #000",
                  }}
                >
                  + Add Custom Item
                </button>
                <button
                  onClick={handleSeedStaples}
                  className="px-5 py-2.5 rounded-full font-bold text-xs bg-white/10 text-white hover:bg-white/15 transition"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  ⚡ Load Common Staples
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" layout>
            <AnimatePresence mode="popLayout">
              {filtered.map((item, i) => {
                const tagColor = item.tag === "Essential" ? CYAN : item.tag === "Health" ? MANGO : LIME;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.04, duration: 0.35 }}
                    className="glass-card p-6 group cursor-pointer flex flex-col gap-4"
                    style={{ boxShadow: "4px 4px 0px #000" }}
                    onClick={() => setSelectedItem(item)}
                    whileHover={{ y: -4, boxShadow: "6px 6px 0px #000" }}
                  >
                    {/* Icon + tag badge */}
                    <div
                      className="w-full aspect-square rounded-xl flex items-center justify-center relative overflow-hidden"
                      style={{ backgroundColor: SC }}
                    >
                      <span className="group-hover:scale-110 transition-transform duration-500 text-7xl select-none">
                        {item.emoji || "🛒"}
                      </span>
                      {item.tag && (
                        <div
                          className="absolute top-3 left-3 px-2 py-1 rounded-full text-[9px] font-bold uppercase"
                          style={{
                            background: tagColor,
                            color: "#111508",
                            fontFamily: "'Space Mono', monospace",
                            boxShadow: "2px 2px 0px #000",
                          }}
                        >
                          {item.tag}
                        </div>
                      )}
                      {/* Delete button */}
                      <button
                        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(255,180,171,0.15)", border: "1px solid rgba(255,180,171,0.3)" }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        disabled={deleting === item.id}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#ffb4ab" }}>
                          {deleting === item.id ? "hourglass_empty" : "delete"}
                        </span>
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 mr-3">
                        <h4 className="font-black text-base uppercase mb-1 truncate" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                          {item.name}
                        </h4>
                        <p className="text-[10px] uppercase truncate" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
                          {item.description || item.category || "Uncategorized"}
                        </p>
                        {item.aliases.length > 0 && (
                          <p className="text-[9px] mt-1 truncate" style={{ fontFamily: "'Space Mono', monospace", color: "#444933" }}>
                            Also: {item.aliases.slice(0, 2).map((a) => a.alias).join(", ")}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-black flex-shrink-0" style={{ fontFamily: "'Syne', sans-serif", color: LIME }}>
                        {item.price_per_unit != null ? `₹${item.price_per_unit}` : "—"}
                      </p>
                    </div>

                    {/* Intelligence CTA */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                      className="w-full py-2.5 rounded-xl font-black uppercase text-xs text-center transition-all flex items-center justify-center gap-1.5"
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        background: "rgba(195,244,0,0.08)",
                        border: `1px solid rgba(195,244,0,0.25)`,
                        color: LIME,
                        fontSize: "11px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>auto_awesome</span>
                      Price Intelligence
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    )}

    {/* ── VIEW 2: GLOBAL MASTER BAZAAR CATALOG ── */}
    {activeTab === "GLOBAL" && (
      <div>
        {/* Search across English, Bengali, Hindi, and Aliases */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search master catalog in English, বাংলা, हिंदी, or local names (e.g. sorsher tel)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm focus:border-lime-400/50 outline-none"
              style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
            />
          </div>
        </div>

        {/* Global Catalog Grid */}
        {globalLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(null).map((_, i) => (
              <div key={i} className="glass-card p-6 flex flex-col gap-4">
                <div className="h-6 skeleton rounded w-1/2" />
                <div className="h-4 skeleton rounded w-3/4" />
                <div className="h-10 skeleton rounded w-full mt-auto" />
              </div>
            ))}
          </div>
        ) : globalItems.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center gap-4 text-center max-w-lg mx-auto">
            <span className="material-symbols-outlined text-5xl" style={{ color: "#444933", fontSize: "48px" }}>
              travel_explore
            </span>
            <p style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf", fontSize: "18px", fontWeight: 700 }}>
              No master catalog items found
            </p>
            <p className="text-sm text-[#8e9379]">
              Try searching for another grocery staple or regional romanization.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalItems.map((entry) => {
              const alreadyInInventory = items.some(
                (it) => it.name.toLowerCase() === entry.name.toLowerCase()
              );

              return (
                <div
                  key={entry.id}
                  className="glass-card p-6 flex flex-col justify-between group relative"
                  style={{ boxShadow: "4px 4px 0px #000" }}
                >
                  <div>
                    {/* Header: Emoji + Category */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-4xl select-none">{entry.emoji || "🛒"}</span>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-white/5 text-[#8e9379] border border-white/10">
                        {entry.category}
                      </span>
                    </div>

                    {/* Title + Multilingual scripts */}
                    <h3 className="font-black text-lg uppercase text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {entry.name}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-[#a1a68d] mb-3">
                      {entry.bengali_name && <span className="bg-lime-400/10 text-lime-300 px-2 py-0.5 rounded-md font-medium">{entry.bengali_name}</span>}
                      {entry.hindi_name && <span className="bg-cyan-400/10 text-cyan-300 px-2 py-0.5 rounded-md font-medium">{entry.hindi_name}</span>}
                    </div>

                    {/* Benchmark Price */}
                    {entry.avg_price_kg != null && (
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-white/40">Market Benchmark</span>
                        <span className="font-mono font-bold text-sm text-lime-400">
                          ₹{Math.round(entry.avg_price_kg)} / {entry.unit}
                        </span>
                      </div>
                    )}

                    {/* Aliases */}
                    {entry.aliases && entry.aliases.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {entry.aliases.slice(0, 4).map((al, idx) => (
                          <span key={idx} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/50">
                            {al}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Button */}
                  {alreadyInInventory ? (
                    <div className="w-full py-2.5 rounded-xl text-xs font-bold font-mono text-center bg-white/10 text-white/60 border border-white/10">
                      ✓ In Your Inventory
                    </div>
                  ) : (
                    <button
                      onClick={() => handleImportFromGlobal(entry)}
                      disabled={importingId === entry.id}
                      className="w-full py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                      style={{
                        background: LIME,
                        color: "#111508",
                        fontFamily: "'Syne', sans-serif",
                        boxShadow: "2px 2px 0px #000",
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {importingId === entry.id ? "Adding…" : "Add to My Inventory"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}
  </div>

      {/* ── Add Item Modal ── */}
      <AnimatePresence>
        {showModal && (
          <AddItemModal
            onClose={() => setShowModal(false)}
            onSuccess={() => { setShowModal(false); load(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Item Intelligence Drawer ── */}
      <ItemDetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={load}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADD ITEM MODAL
═══════════════════════════════════════════════════════════ */
function AddItemModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form,   setForm]   = useState<ItemCreate>({ name: "", emoji: "🛒", category: "", tag: "", unit: "", price_per_unit: undefined });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const update = (field: keyof ItemCreate, val: string | number | undefined) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const handleSubmit = async () => {
    if (!form.name?.trim()) { setError("Item name is required."); return; }
    setError(null);
    setSaving(true);
    try {
      await itemsApi.create({
        ...form,
        name: form.name.trim(),
        price_per_unit: form.price_per_unit ? Number(form.price_per_unit) : undefined,
      });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create item.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e2e4cf",
    fontFamily: "'Hanken Grotesk', sans-serif",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    width: "100%",
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed z-50 bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center"
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: "#1a1d10",
            border: "1px solid rgba(195,244,0,0.15)",
            boxShadow: "0 -8px 48px rgba(0,0,0,0.6)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
              Add Item
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#8e9379" }}>close</span>
            </button>
          </div>

          {/* Emoji picker */}
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => update("emoji", e)}
                  className="w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all"
                  style={{
                    background: form.emoji === e ? "rgba(195,244,0,0.15)" : "rgba(255,255,255,0.04)",
                    border: form.emoji === e ? "1.5px solid rgba(195,244,0,0.5)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {[
            { label: "Item Name *", field: "name" as const, placeholder: "e.g. Organic Tomato" },
            { label: "Category",   field: "category" as const, placeholder: "e.g. Produce" },
            { label: "Tag",        field: "tag" as const, placeholder: "e.g. Essential, Health" },
            { label: "Unit",       field: "unit" as const, placeholder: "e.g. kg, litre, pack" },
          ].map((f) => (
            <div key={f.field}>
              <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
                {f.label}
              </label>
              <input
                type="text"
                placeholder={f.placeholder}
                value={(form[f.field] as string) ?? ""}
                onChange={(e) => update(f.field, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}

          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}>
              Default Price (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 120"
              value={form.price_per_unit ?? ""}
              onChange={(e) => update("price_per_unit", e.target.value ? Number(e.target.value) : undefined)}
              style={inputStyle}
            />
          </div>

          {error && <p className="text-sm" style={{ color: "#ffb4ab", fontFamily: "'Hanken Grotesk', sans-serif" }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 rounded-xl font-black uppercase text-sm mt-1"
            style={{
              background: saving ? "rgba(195,244,0,0.3)" : "#c3f400",
              color: "#1a2200",
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.06em",
              boxShadow: saving ? "none" : "4px 4px 0px #000",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Adding…" : "Add to Inventory"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
