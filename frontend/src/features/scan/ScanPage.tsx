/**
 * ScanPage — Vaniq Unified Ingestion & Planning Hub
 * 3 Top Sections:
 * 1. 📷 OCR Scan Bill
 * 2. ✍️ Manual Purchase Logging
 * 3. 🛒 Bazaar Shopping Lists & Planning
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "../../shared/components/Loader";
import { formatCurrency } from "../../shared/utils";
import { scanApi } from "../../shared/api/scan";
import { ApiError } from "../../shared/api/client";
import { Coins } from "lucide-react";

const LIME = "#c3f400";
const CYAN = "#00dce5";

/* ── Types ── */
const UNIT_OPTIONS = [
  { label: "g",     value: "g",     family: "mass",   factor: 0.001 },
  { label: "kg",    value: "kg",    family: "mass",   factor: 1     },
  { label: "ml",    value: "ml",    family: "volume", factor: 0.001 },
  { label: "L",     value: "L",     family: "volume", factor: 1     },
  { label: "piece", value: "piece", family: "count",  factor: 1     },
];

interface ScannedItem {
  id: string;
  name: string;
  qty: number;
  qtyUnit: string;
  price: number;
  unit: string | null;
  display_qty: string;
  normalized_qty: number;
  unit_family: string | null;
  unit_price: number | null;
  suggestedPrice?: number;
  lastPrice?: number;
}

import { useDraftManager } from "../../shared/hooks/useDraftManager";

type ScanState = "idle" | "scanning" | "result";

const SCAN_STEPS = ["Uploading image…", "Running OCR scan…", "Extracting items…", "Almost done…"];

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

function sanitizeQtyString(rawStr: string): string {
  if (!rawStr) return "1 piece";
  let s = rawStr.trim();
  s = s.replace(/([a-zA-Z]+)\1+/gi, "$1");
  s = s.replace(/^([0-9]+(?:\.[0-9]+)?\s*[a-zA-Z]+)\1+$/i, "$1");
  return s;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const {
    scanDraft,
    saveScanDraft,
    clearScanDraft,
  } = useDraftManager();

  const [state, setState]       = useState<ScanState>("idle");
  const [items, setItems]       = useState<ScannedItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [scanId, setScanId]     = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [scanTitle, setScanTitle]   = useState("");
  const [scanError, setScanError]   = useState("");
  const fileRef                 = useRef<HTMLInputElement>(null);
  const firstInputRef           = useRef<HTMLInputElement>(null);

  /* Restore scan draft on mount if present */
  useEffect(() => {
    if (
      scanDraft &&
      scanDraft.items &&
      scanDraft.items.length > 0 &&
      items.length === 0 &&
      state === "idle"
    ) {
      setItems(scanDraft.items);
      setScanId(scanDraft.scanId);
      setScanTitle(scanDraft.title || "");
      setConfidence(scanDraft.confidence || 90);
      setState("result");
    }
  }, [scanDraft]);

  /* Persist scan draft whenever items or title change while in result state */
  useEffect(() => {
    if (state === "result" && items.length > 0) {
      saveScanDraft({
        scanId,
        title: scanTitle,
        confidence,
        items,
      });
    }
  }, [state, items, scanTitle, scanId, confidence, saveScanDraft]);

  /* Focus first item input when results appear */
  useEffect(() => {
    if (state === "result") {
      setTimeout(() => firstInputRef.current?.focus(), 250);
    }
  }, [state]);

async function compressAndValidateImage(file: File): Promise<File> {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}. Please upload a JPEG, PNG, or WebP.`);
  }

  if (file.type === "application/pdf") {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("PDF exceeds 10MB limit. Please upload a smaller receipt.");
    }
    return file;
  }

  // If already under 1.5MB, upload directly
  if (file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  // Downscale large camera photos on HTML5 Canvas to max 2048px
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 2048;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

  /* ── Scan trigger ── */
  const triggerScan = useCallback(async (file: File) => {
    setState("scanning");
    setScanError("");
    try {
      const processedFile = await compressAndValidateImage(file);
      const result = await scanApi.scan(processedFile);
      setScanId(result.scan_id);
      setConfidence(Math.round(result.confidence * 100));

      const mapped: ScannedItem[] = result.parsed_items.map((item, idx) => {
        const dq = sanitizeQtyString(item.display_qty || (item.qty ? `${item.qty}${item.unit || ''}` : "1 piece"));
        const m = dq.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]*)$/);
        const rawNum = m ? parseFloat(m[1]) : (item.qty || 1);
        const rawUnit = (() => {
          const ut = (m?.[2] || item.unit || "piece").toLowerCase();
          if (["g","gm","gr","gram","grams"].includes(ut)) return "g";
          if (["kg","kgs","kilo"].includes(ut)) return "kg";
          if (["ml","ml."].includes(ut)) return "ml";
          if (["l","lt","lta","ltr","litre","litres"].includes(ut)) return "L";
          return "piece";
        })();
        const normQty = item.normalized_qty || item.qty || 1;
        const linePrice = item.price ?? 0;
        const calcUnitPrice = item.unit_price ?? (linePrice > 0 && normQty > 0 ? Math.round((linePrice / normQty) * 100) / 100 : null);

        return {
          id: String(idx),
          name: item.name,
          qty: rawNum,
          qtyUnit: rawUnit,
          price: linePrice,
          unit: item.unit || "piece",
          display_qty: dq,
          normalized_qty: normQty,
          unit_family: item.unit_family || "count",
          unit_price: calcUnitPrice,
          suggestedPrice: item.suggested_price ?? undefined,
        };
      });

      setItems(mapped.length > 0 ? mapped : [
        { id: "0", name: "Item not detected", qty: 1, qtyUnit: "piece", price: 0, unit: "piece", display_qty: "1 piece", normalized_qty: 1, unit_family: "count", unit_price: 0 },
      ]);
      setState("result");
    } catch (err) {
      setState("idle");
      setScanError(err instanceof ApiError ? err.message : "Failed to parse receipt. Try manual entry.");
    }
  }, []);

  const handleFile = (file?: File) => {
    if (!file) return;
    triggerScan(file);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };
  const onDropzoneKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileRef.current?.click();
    }
  };

  /* ── Item manipulation (Scan Mode) ── */
  const updateItem = (id: string, field: keyof ScannedItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };

        if (field === "qty" || field === "qtyUnit" || field === "price") {
          const rawNum = field === "qty" ? (parseFloat(val) || 0) : it.qty;
          const rawUnit = field === "qtyUnit" ? val : it.qtyUnit;
          const rawPrice = field === "price" ? (parseFloat(val) || 0) : it.price;

          const opt = UNIT_OPTIONS.find((o) => o.value === rawUnit) || UNIT_OPTIONS[4];
          const normQty = rawNum * opt.factor;
          const calcUnitPrice = rawPrice > 0 && normQty > 0 ? Math.round((rawPrice / normQty) * 100) / 100 : null;

          updated.qty = rawNum;
          updated.qtyUnit = rawUnit;
          updated.price = rawPrice;
          updated.display_qty = `${rawNum}${rawUnit}`;
          updated.normalized_qty = normQty;
          updated.unit = opt.family === "mass" ? "kg" : opt.family === "volume" ? "L" : "piece";
          updated.unit_family = opt.family;
          updated.unit_price = calcUnitPrice;
        }

        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addRow = () => {
    const newItem: ScannedItem = {
      id: crypto.randomUUID(),
      name: "",
      qty: 1,
      qtyUnit: "piece",
      price: 0,
      unit: "piece",
      display_qty: "1 piece",
      normalized_qty: 1,
      unit_family: "count",
      unit_price: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  /* ── Save Scan ── */
  const handleSaveScan = async () => {
    const title = scanTitle.trim() || `Bill ${new Date().toLocaleDateString("en-IN")}`;
    try {
      await scanApi.confirm({
        scan_id: scanId ?? 0,
        title,
        items: items.map((i) => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
          unit: i.unit,
          display_qty: i.display_qty,
          normalized_qty: i.normalized_qty,
          unit_family: i.unit_family,
          unit_price: i.unit_price,
        })),
        status: "completed",
      });
      clearScanDraft();
      setState("idle");
      setItems([]);
      setScanId(null);
      setScanTitle("");
      navigate("/profile?tab=history");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to save transaction");
    }
  };

  const handleDiscardScanDraft = () => {
    if (window.confirm("Discard this in-progress scanned bill draft?")) {
      clearScanDraft();
      setState("idle");
      setItems([]);
      setScanId(null);
      setScanTitle("");
    }
  };

  const scanTotal = items.reduce((s, i) => s + (Number(i.price) || 0), 0);

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "#111508", position: "relative" }}
    >
      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%, rgba(171,214,0,0.10) 0%, transparent 60%)", zIndex: 0 }} />

      <div className="page-container pt-20 pb-24 relative z-10">

        {/* Dedicated Scan Header with Direct Navigation Button to Shopping Lists */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: LIME }}>
              OCR Intelligence · Bill Ingestion
            </p>
            <h1 className="text-3xl sm:text-5xl font-black uppercase italic" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
              TRACK YOUR <span style={{ color: LIME }}>BAZAAR</span>
            </h1>
            <p className="mt-2 text-sm max-w-lg" style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#c4c9ac" }}>
              Drop a receipt photo or PDF. VANIQ parses every item, quantity, and unit price with precision.
            </p>
            {scanError && (
              <p className="mt-3 text-xs px-3.5 py-2 rounded-xl inline-block bg-red-500/10 border border-red-500/30 text-red-300">
                {scanError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => navigate("/shop")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/10"
              style={{
                background: "rgba(195,244,0,0.08)",
                border: "1px solid rgba(195,244,0,0.25)",
                color: LIME,
              }}
            >
              <span className="material-symbols-outlined text-base">checklist</span>
              <span>Go to Shopping Lists</span>
            </button>
          </div>
        </motion.div>

        <div>
          {/* Split layout */}
          <div className="flex flex-col xl:flex-row gap-8 items-start">
              {/* Left Area: Dropzone / Loader / Result Table */}
              <div className="flex-1 min-w-0 w-full">
                <AnimatePresence mode="wait">
                  {/* IDLE DROPZONE */}
                  {state === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />

                      <div
                        className={`scan-dropzone flex flex-col items-center justify-center gap-6 py-24 px-8 cursor-pointer select-none rounded-3xl ${dragOver ? "drag-over" : ""}`}
                        style={{
                          background: dragOver ? "rgba(195,244,0,0.06)" : "rgba(255,255,255,0.02)",
                          border: "2px dashed rgba(195,244,0,0.3)",
                          backdropFilter: "blur(12px)",
                        }}
                        onClick={() => fileRef.current?.click()}
                        onKeyDown={onDropzoneKey}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        tabIndex={0}
                      >
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-lime-400/10 border border-lime-400/30 shadow-[0_0_30px_rgba(195,244,0,0.15)]">
                          <span className="material-symbols-outlined text-4xl" style={{ color: LIME }}>document_scanner</span>
                        </div>

                        <div className="text-center space-y-1.5">
                          <p className="text-xl font-bold uppercase tracking-wider" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                            DROP RECEIPT OR TAP TO UPLOAD
                          </p>
                          <p className="text-xs uppercase tracking-widest font-mono text-[#8e9379]">
                            JPG · PNG · WEBP · PDF — UP TO 15MB
                          </p>
                        </div>

                        <button
                          type="button"
                          className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 brutal-btn"
                          style={{ background: LIME, color: "#283500", fontFamily: "'Syne', sans-serif" }}
                          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                        >
                          <span className="material-symbols-outlined text-base">photo_camera</span>
                          Select File / Take Photo
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* SCANNING */}
                  {state === "scanning" && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-4 py-12 px-6 glass-card rounded-3xl"
                    >
                      <Loader variant="ocr" steps={SCAN_STEPS} stepDuration={1400} title="Deep-Parsing Bazaar Receipt…" />
                    </motion.div>
                  )}

                  {/* RESULT REVIEW */}
                  {state === "result" && (
                    <motion.div key="result" variants={stagger} initial="hidden" animate="show" className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black uppercase" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                            Extracted Items
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono" style={{ background: "rgba(195,244,0,0.15)", color: LIME }}>
                            {items.length} items
                          </span>
                          {confidence > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono" style={{ background: "rgba(0,220,229,0.15)", color: CYAN }}>
                              {confidence}% confidence
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={addRow}
                            className="px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 font-mono"
                            style={{ background: "rgba(195,244,0,0.1)", color: LIME, border: "1px solid rgba(195,244,0,0.3)" }}
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add Row
                          </button>
                          <button
                            onClick={() => setState("idle")}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase text-white/50 hover:text-white bg-white/5 font-mono"
                          >
                            New Scan
                          </button>
                        </div>
                      </div>

                      {/* Items rows */}
                      <div className="space-y-2.5">
                        {items.map((item, idx) => (
                          <div key={item.id} className="p-3.5 rounded-2xl glass-card flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <span className="text-[10px] font-mono text-white/30 w-5">#{idx + 1}</span>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(item.id, "name", e.target.value)}
                              placeholder="Item name"
                              className="flex-1 w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm"
                              style={{ fontFamily: "'Syne', sans-serif" }}
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                                className="w-18 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono text-center"
                              />
                              <select
                                value={item.qtyUnit}
                                onChange={(e) => updateItem(item.id, "qtyUnit", e.target.value)}
                                className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono"
                              >
                                {UNIT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value} className="bg-[#181c0e] text-white">{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <div className="relative flex-1 sm:w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-lime-400">₹</span>
                                <input
                                  type="number"
                                  value={item.price || ""}
                                  onChange={(e) => updateItem(item.id, "price", e.target.value)}
                                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono font-bold text-sm text-right"
                                />
                              </div>
                              <button onClick={() => removeItem(item.id)} className="p-2 rounded-xl text-white/30 hover:text-red-400">
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right: Summary Panel (when result active) */}
              {state === "result" && (
                <div className="w-full xl:w-96 glass-card p-6 rounded-3xl" style={{ border: "1px solid rgba(195,244,0,0.2)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-black uppercase text-base flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif", color: "#e2e4cf" }}>
                      <span className="material-symbols-outlined text-xl" style={{ color: LIME }}>receipt_long</span>
                      Scan Summary
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-lime-400/10 text-lime-400 border border-lime-400/20">
                      Draft Saved
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl mb-4 bg-lime-400/10 border border-lime-400/20">
                    <p className="text-[10px] uppercase font-mono text-[#8e9379] mb-1">Total Damage</p>
                    <p className="text-3xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: LIME }}>
                      {formatCurrency(scanTotal)}
                    </p>
                  </div>
                  <div className="mb-4">
                    <label className="text-[10px] uppercase font-mono text-[#8e9379] block mb-1.5">Transaction Title</label>
                    <input
                      type="text"
                      value={scanTitle}
                      onChange={(e) => setScanTitle(e.target.value)}
                      placeholder="e.g. Weekly Bazaar Haul"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleSaveScan}
                      className="w-full py-3.5 rounded-xl font-black uppercase text-sm brutal-btn flex items-center justify-center gap-2 cursor-pointer"
                      style={{ background: LIME, color: "#111508", fontFamily: "'Syne', sans-serif" }}
                    >
                      <Coins className="w-4 h-4 text-[#111508]" />
                      <span>Bag Secured</span>
                    </button>
                    <button
                      onClick={handleDiscardScanDraft}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
                    >
                      Discard Draft
                    </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
  );
}
