/**
 * NotepadMode.tsx — Authentic Bazaar Khata (ডিজিটাল বাজার খাতা)
 *
 * Performance & UX Architecture:
 * - Instant 0ms Checkpoints: Fast client-side tokenizer creates canvas checkpoint rows immediately on Enter.
 * - Debounced Idle / Pause Batch Parsing: Background server enrichment runs after user pauses typing (idle threshold).
 * - Fully Non-Blocking Parallel Typing: Users can freely add new lines, edit, and check items while background parsing runs.
 * - Multi-Shop (Dokan) Tagging: Tag items by dokan (Sabzi Mandi, Fish Stall, Modi Khana, Dairy, or custom).
 * - Dual Saving: Finalizes directly to Purchases or saves as planned Shopping List.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { shoppingListsApi } from "../../shared/api/shoppingLists";
import { transactionsApi } from "../../shared/api/transactions";
import DualScopeSuggestions from "./components/DualScopeSuggestions";
import type { DualSuggestionItem } from "../../shared/api/suggestions";
import { useDraftList } from "../../shared/hooks/useDraftList";
import { useDraftManager } from "../../shared/hooks/useDraftManager";
import type { ParsedListItem } from "../../shared/types";
import "./NotepadMode.css";

interface NotepadModeProps {
  onDone: (listId: number | null) => void;
  onCancel: () => void;
}

// Preset popular bazaar shops
const PRESET_SHOPS = [
  { id: "sabzi", name: "Sabzi Mandi", icon: "🥬" },
  { id: "fish", name: "Fish / Macher Dokan", icon: "🐟" },
  { id: "grocery", name: "Modi Khana / Grocery", icon: "🌾" },
  { id: "dairy", name: "Dairy & Sweets", icon: "🥛" },
  { id: "meat", name: "Meat & Poultry", icon: "🍗" },
  { id: "misc", name: "Misc / General", icon: "🏪" },
];

const IDLE_THRESHOLD_MS = 1300; // Pause threshold to trigger background parsing

// Fast client-side tokenizer for instant (0ms) checkpoint creation
function quickTokenize(rawText: string, fallbackShop: string) {
  let line = rawText.trim();
  line = line.replace(/^[-*•\d]+[.)]\s*/, "").trim();

  // Extract shop (@Shop or shop: Shop)
  let shop = fallbackShop;
  const shopMatch =
    line.match(/@([a-zA-Z0-9_\u0980-\u09FF\u0900-\u097F\s-]+?)(?=\s+\d|\s+₹|\s+Rs|\s*$|@)/) ||
    line.match(/(?:shop|dokan):\s*([a-zA-Z0-9_\u0980-\u09FF\u0900-\u097F\s-]+?)(?=\s+\d|\s+₹|\s+Rs|\s*$)/i);
  if (shopMatch) {
    shop = shopMatch[1].trim();
    line = (line.slice(0, shopMatch.index) + " " + line.slice(shopMatch.index! + shopMatch[0].length)).trim();
  }

  // Attached qty + unit (e.g. 100g, 2kg, 500ml, 12pc)
  let qty: number | null = null;
  let unit: string | null = null;
  const unitMatch = line.match(
    /\b(\d+(?:\.\d+)?)\s*(kg|kgs?|gm?s?|grams?|ml|mls?|ltr?s?|litres?|liters?|l|lt|pcs?|pieces?|packets?|pkt|dozen|dz)\b/i
  );
  if (unitMatch) {
    qty = parseFloat(unitMatch[1]);
    unit = unitMatch[2].toLowerCase();
    line = (line.slice(0, unitMatch.index) + " " + line.slice(unitMatch.index! + unitMatch[0].length)).trim();
  }

  // Currency price (e.g. ₹110, Rs 50)
  let price: number | null = null;
  const currMatch = line.match(/(?:[₹$€£]|Rs\.?\s*)(\d+(?:\.\d+)?)/i);
  if (currMatch) {
    price = parseFloat(currMatch[1]);
    line = line.replace(/(?:[₹$€£]|Rs\.?\s*)\d+(?:\.\d+)?/gi, "").trim();
  }

  // Bare numbers
  const bareNumbers = (line.match(/\b\d+(?:\.\d+)?\b/g) || []).map(Number);
  line = line.replace(/\b\d+(?:\.\d+)?\b/g, "").replace(/\s{2,}/g, " ").trim();

  for (const val of bareNumbers) {
    if (qty === null && unit === null && (val <= 5 || val === 6 || val === 12)) {
      qty = val;
    } else if (price === null) {
      price = val;
    } else if (qty === null) {
      qty = val;
    }
  }

  // Clean name
  let name = line.replace(/[₹,.|×xX]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!name) name = rawText.trim();

  return {
    name,
    quantity: qty ?? 1,
    unit: unit ?? null,
    price: price ?? null,
    shop,
    raw: rawText.trim(),
  };
}

const NotepadMode: React.FC<NotepadModeProps> = ({ onDone, onCancel }) => {
  const { notepadText, saveNotepadText, clearNotepadText } = useDraftManager();
  const [activeLine, setActiveLine] = useState(() => notepadText || "");
  const [activeShop, setActiveShop] = useState<string>("Sabzi Mandi");
  const [customShopInput, setCustomShopInput] = useState("");
  const [editingShopItemId, setEditingShopItemId] = useState<string | null>(null);

  // Background parsing status
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const activeInputRef = useRef<HTMLInputElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightBatchRef = useRef<boolean>(false);

  const { listId, items, addItem, removeItem, updateItem, confirmList, clearDraft } = useDraftList("notepad");

  // Keep a ref to items to prevent stale closures in async batch operations
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Keep active input focused on mount
  useEffect(() => {
    activeInputRef.current?.focus();
  }, []);

  // ── Background Batch Enrichment (Non-Blocking) ───────────────────────────
  const runBatchEnrichment = useCallback(async () => {
    if (inFlightBatchRef.current) return;

    // Pick items that are not yet enriched from the server and not currently in-flight
    const targets = itemsRef.current.filter((it) => !it.isEnriched && !it.isEnriching);
    if (targets.length === 0) return;

    inFlightBatchRef.current = true;
    setIsSyncingPrices(true);

    // Optimistically mark targets as isEnriching
    for (const t of targets) {
      updateItem(t._tempId, { isEnriching: true });
    }

    try {
      // Build multi-line batch text
      const batchPayload = targets.map((t) => t.raw || t.name).join("\n");
      const result = await shoppingListsApi.parseText(batchPayload);
      const parsedList: ParsedListItem[] = result.items ?? [];

      // Map parsed results back to their corresponding item tempId
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const parsed = parsedList[i];

        if (parsed) {
          updateItem(target._tempId, {
            name: parsed.name || target.name,
            quantity: parsed.quantity ?? target.quantity ?? 1,
            unit: parsed.unit ?? target.unit,
            user_price: target.user_price ?? parsed.price ?? parsed.suggested_price ?? null,
            suggested_price: parsed.suggested_price ?? null,
            user_last_price: parsed.user_last_price ?? null,
            market_price: parsed.market_price ?? null,
            emoji: parsed.emoji ?? undefined,
            confidence: (parsed.confidence as string) ?? "high",
            shop: parsed.shop || target.shop,
            isEnriched: true,
            isEnriching: false,
          });
        } else {
          updateItem(target._tempId, {
            isEnriched: true,
            isEnriching: false,
          });
        }
      }
    } catch (err) {
      console.warn("Background parse error:", err);
      // Revert isEnriching flag so next idle cycle can retry
      for (const t of targets) {
        updateItem(t._tempId, { isEnriching: false, isEnriched: true });
      }
    } finally {
      inFlightBatchRef.current = false;
      setIsSyncingPrices(false);

      // Check if more items were added in parallel while this batch was running
      const remaining = itemsRef.current.filter((it) => !it.isEnriched && !it.isEnriching);
      if (remaining.length > 0) {
        scheduleBatchEnrichment(800);
      }
    }
  }, [updateItem]);

  // Schedule or reset the debounce timer
  const scheduleBatchEnrichment = useCallback(
    (delayMs = IDLE_THRESHOLD_MS) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        runBatchEnrichment();
      }, delayMs);
    },
    [runBatchEnrichment]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // ── Instant 0ms Checkpoint Addition on Enter ──────────────────────────────
  const handleLineSubmit = () => {
    const textToProcess = activeLine.trim();
    if (!textToProcess) return;

    setActiveLine("");
    clearNotepadText();
    setShowSuggestions(false);

    // Support single line or multi-line pasted blocks
    const lines = textToProcess.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (const rawLine of lines) {
      const tokenized = quickTokenize(rawLine, activeShop);
      addItem({
        name: tokenized.name,
        quantity: tokenized.quantity,
        unit: tokenized.unit,
        user_price: tokenized.price,
        suggested_price: tokenized.price,
        confidence: "high",
        shop: tokenized.shop,
        raw: tokenized.raw,
        isEnriched: false,
        isEnriching: false,
        source: "notepad",
      });
    }

    // Instantly scroll canvas to bottom to keep next writing line in view
    setTimeout(() => {
      if (canvasWrapRef.current) {
        canvasWrapRef.current.scrollTop = canvasWrapRef.current.scrollHeight;
      }
      activeInputRef.current?.focus();
    }, 20);

    // Start / reset idle timer for background enrichment
    scheduleBatchEnrichment(IDLE_THRESHOLD_MS);
  };

  // ── Handle suggestion select ──────────────────────────────────────────────
  const handleSelectSuggestion = (s: DualSuggestionItem) => {
    addItem({
      name: s.name,
      quantity: 1,
      unit: s.unit ?? null,
      user_price: s.price ?? null,
      suggested_price: s.price ?? null,
      emoji: s.emoji ?? undefined,
      confidence: "high",
      shop: activeShop,
      source: s.source,
      isEnriched: true, // Already enriched from lexicon
    });
    setActiveLine("");
    clearNotepadText();
    setShowSuggestions(false);
    activeInputRef.current?.focus();
  };

  // ── Metrics Calculation ───────────────────────────────────────────────────
  const totalEst = items.reduce((sum, it) => {
    const p = it.user_price ?? it.suggested_price ?? it.market_price ?? it.user_last_price ?? 0;
    return sum + p * (it.quantity ?? 1);
  }, 0);

  const pendingCount = items.filter((i) => !i.is_bought).length;
  const boughtCount = items.length - pendingCount;
  const unEnrichedCount = items.filter((i) => !i.isEnriched).length;

  // Shop Breakdown summary
  const shopBreakdown = React.useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const it of items) {
      const s = it.shop || "General";
      if (!map[s]) map[s] = { count: 0, total: 0 };
      map[s].count += 1;
      const p = it.user_price ?? it.suggested_price ?? it.market_price ?? 0;
      map[s].total += p * (it.quantity ?? 1);
    }
    return Object.entries(map).map(([shop, data]) => ({ shop, ...data }));
  }, [items]);

  // ── Flush remaining unparsed lines before saving ──────────────────────────
  const flushBeforeSave = async () => {
    // If active line has text, add it
    if (activeLine.trim()) {
      const tokenized = quickTokenize(activeLine.trim(), activeShop);
      await addItem({
        name: tokenized.name,
        quantity: tokenized.quantity,
        unit: tokenized.unit,
        user_price: tokenized.price,
        suggested_price: tokenized.price,
        confidence: "high",
        shop: tokenized.shop,
        raw: tokenized.raw,
        isEnriched: false,
        isEnriching: false,
        source: "notepad",
      });
      setActiveLine("");
    }

    // Cancel pending debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    // If there are un-enriched lines, flush them once
    const pending = itemsRef.current.filter((it) => !it.isEnriched && !it.isEnriching);
    if (pending.length > 0) {
      try {
        const batchPayload = pending.map((t) => t.raw || t.name).join("\n");
        const res = await shoppingListsApi.parseText(batchPayload);
        const parsedList = res.items ?? [];
        for (let i = 0; i < pending.length; i++) {
          const target = pending[i];
          const parsed = parsedList[i];
          if (parsed) {
            updateItem(target._tempId, {
              name: parsed.name || target.name,
              quantity: parsed.quantity ?? target.quantity ?? 1,
              unit: parsed.unit ?? target.unit,
              user_price: target.user_price ?? parsed.price ?? parsed.suggested_price ?? null,
              suggested_price: parsed.suggested_price ?? null,
              emoji: parsed.emoji ?? undefined,
              shop: parsed.shop || target.shop,
              isEnriched: true,
            });
          }
        }
      } catch {
        // Fallback: continue with client tokenized values
      }
    }
  };

  // ── Save Option A: Save to Shopping List ──────────────────────────────────
  const handleSaveAsList = async () => {
    setIsSavingAction(true);
    try {
      await flushBeforeSave();
      await confirmList();
      onDone(listId);
    } catch {
      onDone(listId);
    } finally {
      setIsSavingAction(false);
    }
  };

  // ── Save Option B: Finalize as Completed Purchase ─────────────────────────
  const handleSaveAsPurchase = async () => {
    if (items.length === 0 && !activeLine.trim()) return;
    setIsSavingAction(true);
    setNoticeMsg(null);

    try {
      await flushBeforeSave();

      const currentItemList = itemsRef.current;
      const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const shopNames = Array.from(new Set(currentItemList.map((i) => i.shop).filter(Boolean)));
      const titleSuffix = shopNames.length > 0 ? ` (${shopNames.slice(0, 2).join(", ")})` : "";
      const txTitle = `Bazaar Haul · ${todayStr}${titleSuffix}`;

      await transactionsApi.create({
        title: txTitle,
        source: "Manual",
        status: "completed",
        items: currentItemList.map((it) => ({
          name: it.shop ? `${it.name} [${it.shop}]` : it.name,
          qty: it.quantity ?? 1,
          price: (it.user_price ?? it.suggested_price ?? it.market_price ?? 0) * (it.quantity ?? 1),
          unit: it.unit ?? null,
        })),
      });

      clearDraft();
      clearNotepadText();
      onDone(null);
    } catch (err: unknown) {
      console.error("Save purchase error:", err);
      setNoticeMsg("Could not save purchase directly. Saved to shopping list.");
      await confirmList();
      onDone(listId);
    } finally {
      setIsSavingAction(false);
    }
  };

  return (
    <div className="np-root">
      {/* ── 1. Top Header ────────────────────────────────────────────── */}
      <div className="np-header">
        <button className="np-btn-ghost" onClick={onCancel} title="Exit Khata">
          Cancel
        </button>

        <div className="np-header-center">
          <div className="np-title-wrap">
            <span className="np-title">
              <span>📒</span> Bazaar Khata
            </span>
            <span className="np-subtitle">বাজার খাতা · Instant Canvas Ledger</span>
          </div>

          {items.length > 0 && (
            <span className="np-badge">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          )}

          {/* Non-blocking background sync indicator */}
          {isSyncingPrices ? (
            <span className="np-sync-pill np-sync-pill--syncing">
              <span className="np-sync-pulse" />
              <span>Syncing prices…</span>
            </span>
          ) : unEnrichedCount === 0 && items.length > 0 ? (
            <span className="np-sync-pill np-sync-pill--synced">
              <span>✓</span>
              <span>Priced</span>
            </span>
          ) : null}
        </div>

        <button
          className="np-btn-primary"
          onClick={handleSaveAsList}
          disabled={(items.length === 0 && !activeLine.trim()) || isSavingAction}
          title="Save to shopping list"
        >
          <span>Done</span>
          <span className="text-xs">✓</span>
        </button>
      </div>

      {/* ── 2. Shop / Dokan Selector Bar ─────────────────────────────── */}
      <div className="np-shop-bar">
        <span className="np-shop-label">
          <span>🏪</span> Active Shop:
        </span>

        <div className="np-shop-chips">
          {PRESET_SHOPS.map((s) => {
            const isSelected = activeShop === s.name;
            return (
              <button
                key={s.id}
                type="button"
                className={`np-shop-chip ${isSelected ? "np-shop-chip--active" : ""}`}
                onClick={() => {
                  setActiveShop(s.name);
                  activeInputRef.current?.focus();
                }}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </button>
            );
          })}

          {/* Custom Dokan entry */}
          <input
            type="text"
            className="np-custom-shop-input"
            placeholder="+ Custom Dokan…"
            value={customShopInput}
            onChange={(e) => setCustomShopInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customShopInput.trim()) {
                e.preventDefault();
                setActiveShop(customShopInput.trim());
                setCustomShopInput("");
                activeInputRef.current?.focus();
              }
            }}
          />
        </div>
      </div>

      {/* ── 3. The Continuous Canvas Sheet (Khata) ──────────────────── */}
      <div className="np-canvas-wrap" ref={canvasWrapRef}>
        <div className="np-canvas-sheet">
          {/* Lined Checkpointed Rows */}
          {items.map((item) => {
            const isChecked = !!item.is_bought;
            const price = item.user_price ?? item.suggested_price ?? item.market_price ?? item.user_last_price;

            return (
              <div
                key={item._tempId}
                className={`np-canvas-line ${isChecked ? "np-canvas-line--bought" : ""} ${
                  !item.isEnriched ? "np-line--pending-enrich" : "np-line--enriched"
                }`}
              >
                {/* Checkpoint button on left */}
                <button
                  type="button"
                  className={`np-checkpoint-btn ${isChecked ? "np-checkpoint-btn--checked" : ""}`}
                  onClick={() => updateItem(item._tempId, { is_bought: !isChecked })}
                  title={isChecked ? "Mark as unbought" : "Mark as bought (checkpoint)"}
                  aria-label="Toggle checkpoint"
                >
                  {isChecked ? "✓" : ""}
                </button>

                {/* Line contents */}
                <div className="np-line-content">
                  <div className="np-item-main">
                    <span className="np-item-emoji">{item.emoji ?? "🛒"}</span>
                    <span className="np-item-title">{item.name}</span>

                    {/* Quantity tag */}
                    {(item.quantity || item.unit) && (
                      <span className="np-item-qty">
                        {item.quantity ? `${item.quantity}` : ""}
                        {item.unit ? `${item.unit}` : ""}
                      </span>
                    )}

                    {/* Dokan / Shop Pill */}
                    {editingShopItemId === item._tempId ? (
                      <select
                        className="text-xs bg-[#101722] border border-[#c3f400] text-[#c3f400] rounded px-1 py-0.5 outline-none"
                        value={item.shop || "Sabzi Mandi"}
                        autoFocus
                        onBlur={() => setEditingShopItemId(null)}
                        onChange={(e) => {
                          updateItem(item._tempId, { shop: e.target.value });
                          setEditingShopItemId(null);
                        }}
                      >
                        {PRESET_SHOPS.map((ps) => (
                          <option key={ps.id} value={ps.name}>
                            {ps.name}
                          </option>
                        ))}
                        {activeShop && !PRESET_SHOPS.some((p) => p.name === activeShop) && (
                          <option value={activeShop}>{activeShop}</option>
                        )}
                      </select>
                    ) : (
                      <span
                        className="np-dokan-tag"
                        onClick={() => setEditingShopItemId(item._tempId)}
                        title="Click to change shop for this item"
                      >
                        <span>🏪</span>
                        <span>{item.shop || "Sabzi Mandi"}</span>
                      </span>
                    )}
                  </div>

                  {/* Price Chips & Delete */}
                  <div className="np-item-meta">
                    <div className="np-price-chips">
                      {item.user_last_price && (
                        <button
                          type="button"
                          className="np-price-chip-btn"
                          onClick={() => updateItem(item._tempId, { user_price: item.user_last_price! })}
                          title="Click to use your last purchase price"
                        >
                          🕐 ₹{item.user_last_price}
                        </button>
                      )}

                      {item.market_price && (
                        <button
                          type="button"
                          className="np-price-chip-btn"
                          onClick={() => updateItem(item._tempId, { user_price: item.market_price! })}
                          title="Click to use community market price"
                        >
                          🌍 ₹{item.market_price}
                        </button>
                      )}

                      {price !== null && price !== undefined && (
                        <span className="np-item-price">₹{Math.round(price * (item.quantity ?? 1))}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="np-del-btn"
                      onClick={() => removeItem(item._tempId)}
                      title="Remove line"
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Active Writing Line directly on the Canvas ───────────── */}
          <div className="np-active-line">
            {/* Active checkpoint marker */}
            <div className="np-active-checkpoint-marker">
              <span />
            </div>

            <div className="np-active-input-wrap">
              <input
                ref={activeInputRef}
                type="text"
                className="np-active-input"
                placeholder={
                  items.length === 0
                    ? `Write on canvas, e.g. alu 2kg 40 @${activeShop}, posto 100g 110…`
                    : `Next item for ${activeShop} (e.g. dim 12 @Dairy, ada 100g 20)…`
                }
                value={activeLine}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveLine(val);
                  saveNotepadText(val);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleLineSubmit();
                  }
                }}
              />

              {/* Suggestions floating directly beneath active writing line */}
              {showSuggestions && activeLine.trim().length > 0 && (
                <div className="relative">
                  <DualScopeSuggestions
                    query={activeLine}
                    onSelect={handleSelectSuggestion}
                    onClose={() => setShowSuggestions(false)}
                  />
                </div>
              )}
            </div>

            <span className="np-input-meta-hint">
              <kbd>Enter</kbd> ↵
            </span>
          </div>

          {/* Canvas empty state helper guidance on lines */}
          {items.length === 0 && (
            <div className="np-canvas-empty-hint">
              <div className="np-empty-tagline">
                <span>⚡</span>
                <span>Instant 0ms typing — checkpoints form on Enter; prices auto-sync when you pause:</span>
              </div>
              <div className="np-canvas-examples">
                <span
                  className="np-example-pill"
                  onClick={() => {
                    setActiveLine("alu 2kg 40 @SabziMandi");
                    activeInputRef.current?.focus();
                  }}
                >
                  alu 2kg 40 @SabziMandi
                </span>
                <span
                  className="np-example-pill"
                  onClick={() => {
                    setActiveLine("posto 100g 110 @ModiKhana");
                    activeInputRef.current?.focus();
                  }}
                >
                  posto 100g 110 @ModiKhana
                </span>
                <span
                  className="np-example-pill"
                  onClick={() => {
                    setActiveLine("dim 12 @Dairy");
                    activeInputRef.current?.focus();
                  }}
                >
                  dim 12 @Dairy
                </span>
                <span
                  className="np-example-pill"
                  onClick={() => {
                    setActiveLine("rui mach 1kg 240 @FishMarket");
                    activeInputRef.current?.focus();
                  }}
                >
                  rui mach 1kg 240 @FishMarket
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. End of Notepad Summary & Save Actions ─────────────────── */}
      <div className="np-footer-bar">
        <div className="np-footer-summary">
          <span className="np-stat-total">
            {items.length} item{items.length !== 1 ? "s" : ""}
            {boughtCount > 0 && ` (${boughtCount} checked)`} · Est. <strong>₹{Math.round(totalEst)}</strong>
          </span>

          {/* Shop Breakdown Pills */}
          {shopBreakdown.length > 0 && (
            <div className="np-shop-breakdown">
              {shopBreakdown.map((sb) => (
                <span key={sb.shop} className="np-shop-pill">
                  <span>🏪</span>
                  <span>
                    {sb.shop} ({sb.count} · ₹{Math.round(sb.total)})
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="np-footer-actions">
          {items.length > 0 && (
            <button
              type="button"
              className="np-btn-ghost text-xs text-red-400 hover:text-red-300"
              onClick={() => {
                clearDraft();
                clearNotepadText();
                setActiveLine("");
              }}
            >
              Clear
            </button>
          )}

          {/* Save Option 1: Save as Shopping List */}
          <button
            type="button"
            className="np-btn-primary"
            onClick={handleSaveAsList}
            disabled={(items.length === 0 && !activeLine.trim()) || isSavingAction}
            title="Save as Bazaar Shopping List"
          >
            {isSavingAction ? (
              <>
                <span className="np-spin-icon">⏳</span> Saving…
              </>
            ) : (
              <>
                <span>Save to List</span>
                <span>📋</span>
              </>
            )}
          </button>

          {/* Save Option 2: Save directly as Purchase */}
          <button
            type="button"
            className="np-btn-save-tx"
            onClick={handleSaveAsPurchase}
            disabled={(items.length === 0 && !activeLine.trim()) || isSavingAction}
            title="Convert and log directly into completed Purchases"
          >
            {isSavingAction ? (
              <>
                <span className="np-spin-icon">⏳</span> Saving…
              </>
            ) : (
              <>
                <span>Add to Purchases</span>
                <span>⚡</span>
              </>
            )}
          </button>
        </div>
      </div>

      {noticeMsg && (
        <div className="p-2 text-xs text-amber-300 bg-amber-900/30 border-t border-amber-500/20 text-center">
          {noticeMsg}
        </div>
      )}
    </div>
  );
};

export default NotepadMode;
