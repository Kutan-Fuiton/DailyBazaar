/**
 * ShopPage — Dedicated Shopping Lists & Bazaar Planning Hub.
 * Independent page from OCR scanning with cross-navigation.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ShoppingListView from "../scan/components/ShoppingListView";

const LIME = "#c3f400";
const CYAN = "#00dce5";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

export default function ShopPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      {/* Subtle top green gradient */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "35vh",
          background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(171,214,0,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="page-container pt-20 pb-28 relative z-10">
        {/* Header with Direct Navigation Button to Bill Scanner */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          {...fadeUp}
        >
          <div>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: LIME,
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              Market Logistics · Planning Hub
            </p>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(26px, 5vw, 38px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#e2e4cf",
                lineHeight: 1.1,
              }}
            >
              Bazaar <span style={{ color: LIME }}>Planning</span>
            </h1>
            <p style={{ color: "#8e9379", fontSize: "13px", marginTop: "6px", maxWidth: "560px" }}>
              Create grocery lists via quick text paste, check off items in the bazaar, and convert them to transactions with one tap.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => navigate("/scan")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/10"
              style={{
                background: "rgba(0,220,229,0.08)",
                border: "1px solid rgba(0,220,229,0.25)",
                color: CYAN,
              }}
            >
              <span className="material-symbols-outlined text-base">photo_camera</span>
              <span>Scan A Bill (OCR)</span>
            </button>
          </div>
        </motion.div>

        {/* Dedicated Shopping List Interactive Module */}
        <ShoppingListView onTransactionCreated={() => navigate("/profile?tab=history")} />
      </div>
    </div>
  );
}
