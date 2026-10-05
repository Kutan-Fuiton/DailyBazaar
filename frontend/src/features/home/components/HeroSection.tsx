import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { scanApi } from "../../../shared/api/scan";
import { useDraftManager } from "../../../shared/hooks/useDraftManager";

const LIME = "#c3f400";
const BORDER_COLOR = "rgba(195, 244, 0, 0.18)";

export default function HeroSection() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("Analyzing receipt...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    mode,
    setMode,
    hasScanDraft,
    scanDraft,
    hasNotepadDraft,
    hasListDraft,
  } = useDraftManager();

  const handleScanClick = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMessage(null);
    setScanStep("Uploading bill...");

    try {
      setTimeout(() => setScanStep("Extracting items & prices..."), 1200);
      setTimeout(() => setScanStep("Cross-referencing lexicon..."), 2400);

      const res = await scanApi.scan(file);
      if (res && res.parsed_items) {
        navigate("/confirm", { state: { scanResult: res } });
      } else {
        throw new Error("No parsed data received from scanner");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      setErrorMessage(
        err?.response?.data?.detail || err?.message || "Failed to scan receipt. Please try again."
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <section className="relative pt-6 pb-8 flex flex-col items-center text-center">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        className="hidden"
        disabled={isScanning}
      />

      {/* Brand Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
        style={{
          background: "rgba(195, 244, 0, 0.08)",
          border: "1px solid rgba(195, 244, 0, 0.22)",
        }}
      >
        <span
          className="w-2 h-2 rounded-full animate-ping"
          style={{ background: LIME }}
        />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: LIME,
            textTransform: "uppercase",
          }}
        >
          DailyBazaar OCR & Price Intelligence
        </span>
      </motion.div>

      {/* Hero Title with Framer Motion */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(32px, 6.5vw, 48px)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#e2e4cf",
          lineHeight: 1.1,
          marginBottom: "12px",
        }}
      >
        Track your bazaar<span style={{ color: LIME }}>.</span>
        <br />
        <span
          style={{
            background: "linear-gradient(90deg, #c3f400 0%, #8ae878 50%, #00dce5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Save smarter.
        </span>
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "clamp(14px, 2.8vw, 16px)",
          color: "#8e9379",
          maxWidth: "460px",
          lineHeight: 1.5,
          marginBottom: "28px",
        }}
      >
        Snap paper chits or printed bills to track prices, build shopping lists, and detect inflation instantly.
      </motion.p>

      {/* Main Scan Action Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.22 }}
        className="w-full max-w-sm flex flex-col items-center gap-3"
      >
        {/* Mode Selector Dropdown / Segmented Switcher */}
        <div
          className="w-full flex items-center p-1 rounded-2xl mb-1 relative"
          style={{
            background: "rgba(18, 22, 10, 0.8)",
            border: `1px solid ${BORDER_COLOR}`,
          }}
        >
          {(
            [
              { id: "scan", label: "Scan Bill", icon: "photo_camera", hasDraft: hasScanDraft },
              { id: "list", label: "Shopping List", icon: "checklist", hasDraft: hasListDraft },
              { id: "notepad", label: "Smart Notepad", icon: "edit_note", hasDraft: hasNotepadDraft },
            ] as const
          ).map((item) => {
            const isActive = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className="flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-semibold relative"
                style={{
                  background: isActive ? "rgba(195, 244, 0, 0.15)" : "transparent",
                  color: isActive ? LIME : "#8e9379",
                  border: isActive ? "1px solid rgba(195, 244, 0, 0.28)" : "1px solid transparent",
                }}
              >
                <span className="material-symbols-outlined text-sm leading-none">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {item.hasDraft && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: LIME }}
                    title="Active draft available"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Primary Dynamic Action Button */}
        {mode === "scan" && (
          <button
            onClick={handleScanClick}
            disabled={isScanning}
            className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all duration-200 active:scale-[0.98] group relative overflow-hidden"
            style={{
              background: isScanning ? "#8e9379" : LIME,
              color: "#111508",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 12px 30px rgba(195, 244, 0, 0.25), 0 2px 4px rgba(0,0,0,0.4)",
              cursor: isScanning ? "wait" : "pointer",
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%)",
              }}
            />
            <span
              className="material-symbols-outlined text-2xl font-bold"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isScanning ? "hourglass_top" : "photo_camera"}
            </span>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "17px",
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              {isScanning ? scanStep : "Scan Bill"}
            </span>
          </button>
        )}

        {mode === "list" && (
          <button
            onClick={() => navigate("/scan?mode=list")}
            className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all duration-200 active:scale-[0.98] group relative overflow-hidden"
            style={{
              background: LIME,
              color: "#111508",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 12px 30px rgba(195, 244, 0, 0.25), 0 2px 4px rgba(0,0,0,0.4)",
              cursor: "pointer",
            }}
          >
            <span
              className="material-symbols-outlined text-2xl font-bold"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              checklist
            </span>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "17px",
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              Open Shopping List
            </span>
          </button>
        )}

        {mode === "notepad" && (
          <button
            onClick={() => navigate("/scan?mode=notepad")}
            className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all duration-200 active:scale-[0.98] group relative overflow-hidden"
            style={{
              background: LIME,
              color: "#111508",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 12px 30px rgba(195, 244, 0, 0.25), 0 2px 4px rgba(0,0,0,0.4)",
              cursor: "pointer",
            }}
          >
            <span
              className="material-symbols-outlined text-2xl font-bold"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              edit_note
            </span>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "17px",
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              Open Smart Notepad
            </span>
          </button>
        )}

        {/* Draft Notice if active for current mode */}
        {mode === "scan" && hasScanDraft && !isScanning && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs"
            style={{
              background: "rgba(195, 244, 0, 0.08)",
              border: "1px solid rgba(195, 244, 0, 0.25)",
              color: "#e2e4cf",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LIME }} />
              <span>Unconfirmed scan ({scanDraft?.items?.length ?? 0} items)</span>
            </div>
            <button
              onClick={() => navigate("/confirm", { state: { scanResult: scanDraft } })}
              className="font-bold underline hover:opacity-80"
              style={{ color: LIME, background: "none", border: "none", cursor: "pointer" }}
            >
              Resume →
            </button>
          </motion.div>
        )}

        {mode === "list" && hasListDraft && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs"
            style={{
              background: "rgba(195, 244, 0, 0.08)",
              border: "1px solid rgba(195, 244, 0, 0.25)",
              color: "#e2e4cf",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LIME }} />
              <span>Shopping list draft in progress</span>
            </div>
            <button
              onClick={() => navigate("/scan?mode=list")}
              className="font-bold underline hover:opacity-80"
              style={{ color: LIME, background: "none", border: "none", cursor: "pointer" }}
            >
              Continue →
            </button>
          </motion.div>
        )}

        {mode === "notepad" && hasNotepadDraft && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs"
            style={{
              background: "rgba(195, 244, 0, 0.08)",
              border: "1px solid rgba(195, 244, 0, 0.25)",
              color: "#e2e4cf",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LIME }} />
              <span>Notepad draft text saved</span>
            </div>
            <button
              onClick={() => navigate("/scan?mode=notepad")}
              className="font-bold underline hover:opacity-80"
              style={{ color: LIME, background: "none", border: "none", cursor: "pointer" }}
            >
              Resume →
            </button>
          </motion.div>
        )}

        {/* Error message if any */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-xs text-red-400 bg-red-950/40 border border-red-800/40 px-3 py-2 rounded-lg"
            >
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
