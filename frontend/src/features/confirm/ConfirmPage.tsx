/**
 * ConfirmPage.tsx — DailyBazaar Scan Confirmation & Lexicon Training Flow.
 *
 * Steps:
 * 1. Fetches or receives scanned items from OCR
 * 2. Allows inline editing of item names, quantities, units, and prices
 * 3. Highlights corrected items (which automatically update Lexicon OCR & Aliases)
 * 4. Allows naming the shop ("dokan") or auto-generating a unique name
 * 5. Saves transaction and clears scan draft
 */

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { scanApi } from "../../shared/api/scan";
import { useDraftManager } from "../../shared/hooks/useDraftManager";
import type { ParsedItem, ScanResponse } from "../../shared/types";
import { Dices } from "lucide-react";

const LIME = "#c3f400";
const SURFACE_CARD = "rgba(26, 31, 15, 0.85)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.2)";

const COMMON_UNITS = ["kg", "g", "L", "ml", "piece", "packet", "bunch"];

const SAMPLE_DOKAN_NAMES = [
  "Local Sabji Mandi",
  "Gariahat Morning Bazaar",
  "Fresh Veggie Corner",
  "Daily Supermarket",
  "Lake Market Vendor",
  "Maa Tara Stores",
  "Kolkata Wholesale Mandi",
];

export default function ConfirmPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { scanDraft, clearScanDraft } = useDraftManager();

  // Load from location.state or fallback to active scanDraft
  const initialScan = (location.state as { scanResult?: ScanResponse } | null)?.scanResult || scanDraft;

  const [scanId] = useState<number | null>(() => {
    if (!initialScan) return null;
    if ("scan_id" in initialScan) return initialScan.scan_id;
    if ("scanId" in initialScan) return initialScan.scanId;
    return null;
  });
  const [dokanName, setDokanName] = useState("");
  const [items, setItems] = useState<ParsedItem[]>(() => {
    if (!initialScan) return [];
    if ("parsed_items" in initialScan && initialScan.parsed_items) {
      return initialScan.parsed_items;
    }
    if ("items" in initialScan && initialScan.items) {
      return initialScan.items.map((it: any) => ({
        name: it.name,
        qty: it.qty ?? 1,
        price: it.price ?? 0,
        unit: it.unit ?? "piece",
        raw: it.name,
      }));
    }
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!initialScan && items.length === 0) {
      // Nothing to confirm
    }
  }, [initialScan, items.length]);

  const totalAmount = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  const handleUpdateItem = (index: number, field: keyof ParsedItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        qty: 1,
        unit: "kg",
        price: 0,
        raw: "",
      },
    ]);
  };

  const handleRandomDokan = () => {
    const randomName = SAMPLE_DOKAN_NAMES[Math.floor(Math.random() * SAMPLE_DOKAN_NAMES.length)];
    const uniqueSuffix = Math.floor(Math.random() * 90 + 10);
    setDokanName(`${randomName} #${uniqueSuffix}`);
  };

  const handleSave = async () => {
    if (items.length === 0) {
      setErrorMsg("Please add at least one item before saving.");
      return;
    }

    // Validate item names
    for (const item of items) {
      if (!item.name.trim()) {
        setErrorMsg("All items must have a name.");
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const title = dokanName.trim() || undefined; // If undefined, system auto-generates unique name
      await scanApi.confirm({
        scan_id: scanId ?? 0,
        title: title || "",
        items: items.map((it) => ({
          ...it,
          price: Number(it.price) || 0,
          qty: Number(it.qty) || 1,
        })),
        status: "completed",
      });

      // Clear the scan draft once saved successfully
      clearScanDraft();

      navigate("/profile?tab=history", { replace: true });
    } catch (err: any) {
      console.error("Save transaction error:", err);
      setErrorMsg(
        err?.response?.data?.detail?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to save transaction. Please check your items."
      );
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0 && !initialScan) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-5xl mb-3" style={{ color: "#8e9379" }}>
          receipt_long
        </span>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "22px",
            fontWeight: 700,
            color: "#e2e4cf",
            marginBottom: "8px",
          }}
        >
          No Scanned Bill Found
        </h2>
        <p style={{ color: "#8e9379", fontSize: "14px", maxWidth: "340px", marginBottom: "20px" }}>
          Scan a bill first from the home page to review and confirm items.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: LIME, color: "#111508", border: "none", cursor: "pointer" }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-20 pb-28 px-3 sm:px-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-1.5 text-xs text-[#8e9379] hover:text-[#c3f400] transition-colors mb-2"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </button>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(24px, 5vw, 30px)",
              fontWeight: 800,
              color: "#e2e4cf",
              letterSpacing: "-0.02em",
            }}
          >
            Confirm Items<span style={{ color: LIME }}>.</span>
          </h1>
          <p style={{ color: "#8e9379", fontSize: "13px" }}>
            Review scanned prices and names. Corrected names train the system for future scans.
          </p>
        </div>

        {/* Total badge */}
        <div
          className="px-4 py-2 rounded-2xl flex items-center gap-2 self-start sm:self-center"
          style={{
            background: "rgba(195, 244, 0, 0.10)",
            border: `1px solid ${BORDER_COLOR}`,
          }}
        >
          <span className="text-xs text-[#8e9379] uppercase font-semibold">Total:</span>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "20px",
              fontWeight: 800,
              color: LIME,
            }}
          >
            ₹{Math.round(totalAmount)}
          </span>
        </div>
      </div>

      {/* Dokan (Shop Name) Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 rounded-2xl mb-5"
        style={{
          background: SURFACE_CARD,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <label
          className="block text-xs uppercase tracking-wider font-semibold text-[#8e9379] mb-1.5"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Dokan / Shop Name
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg"
              style={{ color: "#8e9379" }}
            >
              storefront
            </span>
            <input
              type="text"
              value={dokanName}
              onChange={(e) => setDokanName(e.target.value)}
              placeholder="e.g. Gariahat Sabji Mandi (or leave empty to auto-generate)"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#c3f400]"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e2e4cf",
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          <button
            onClick={handleRandomDokan}
            type="button"
            title="Generate Random Dokan Name"
            className="px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all hover:border-[#c3f400]/40 shrink-0"
            style={{
              background: "rgba(195, 244, 0, 0.08)",
              border: `1px solid ${BORDER_COLOR}`,
              color: LIME,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <Dices className="w-4 h-4 text-[#c3f400]" />
            <span className="hidden sm:inline">Random Dokan</span>
          </button>
        </div>
      </motion.div>

      {/* Items Review List */}
      <div className="flex flex-col gap-2.5 mb-6">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#8e9379]">
            {items.length} Extracted Items
          </span>
          <button
            onClick={handleAddItem}
            className="text-xs flex items-center gap-1 font-semibold hover:underline"
            style={{ color: LIME, background: "none", border: "none", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Add Item
          </button>
        </div>

        <AnimatePresence>
          {items.map((item, idx) => {
            const wasCorrected = item.raw && item.raw.trim().toLowerCase() !== item.name.trim().toLowerCase();
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative"
                style={{
                  background: SURFACE_CARD,
                  border: wasCorrected
                    ? "1px solid rgba(0, 220, 229, 0.4)"
                    : `1px solid ${BORDER_COLOR}`,
                }}
              >
                {/* Item Name */}
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                    placeholder="Item name"
                    className="w-full px-2.5 py-1.5 rounded-lg text-sm font-medium focus:outline-none focus:border-[#c3f400]"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#e2e4cf",
                    }}
                  />
                  {wasCorrected && (
                    <div className="text-[10px] text-[#00dce5] mt-1 pl-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                      <span>OCR read "{item.raw}" → Will save to Lexicon mapping</span>
                    </div>
                  )}
                </div>

                {/* Qty & Unit */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={item.qty || ""}
                    onChange={(e) => handleUpdateItem(idx, "qty", parseFloat(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-16 px-2 py-1.5 rounded-lg text-sm text-center font-mono focus:outline-none"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#e2e4cf",
                    }}
                  />

                  <select
                    value={item.unit || "piece"}
                    onChange={(e) => handleUpdateItem(idx, "unit", e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-xs font-mono focus:outline-none cursor-pointer"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#e2e4cf",
                    }}
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} style={{ background: "#111508" }}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price (₹) */}
                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <span className="text-xs text-[#8e9379] font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.price || ""}
                    onChange={(e) => handleUpdateItem(idx, "price", parseFloat(e.target.value) || 0)}
                    placeholder="Price"
                    className="w-20 px-2 py-1.5 rounded-lg text-sm text-right font-mono font-bold focus:outline-none"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: LIME,
                    }}
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    title="Remove item"
                    className="p-1.5 rounded-lg text-[#8e9379] hover:text-red-400 hover:bg-white/5 transition-colors ml-1"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="mb-4 text-xs text-red-400 bg-red-950/40 border border-red-800/40 px-3 py-2.5 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={() => {
            if (window.confirm("Discard this scan?")) {
              clearScanDraft();
              navigate("/home");
            }
          }}
          className="px-4 py-3 rounded-xl text-xs font-semibold text-[#8e9379] hover:text-[#e2e4cf] transition-colors"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          Discard
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 sm:flex-none px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-xl transition-all duration-200 active:scale-[0.98]"
          style={{
            background: saving ? "#8e9379" : LIME,
            color: "#111508",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          <span className="material-symbols-outlined text-lg">
            {saving ? "hourglass_top" : "check_circle"}
          </span>
          <span>{saving ? "Saving Transaction..." : "Save Transaction"}</span>
        </button>
      </div>
    </div>
  );
}
