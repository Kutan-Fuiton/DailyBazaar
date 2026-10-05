/**
 * ShopPage — Shopping lists hub.
 *
 * Shows active draft lists from useDraftList.
 * Placeholder for Phase 2 full shopping state machine
 * (DRAFT → SHOPPING → REVIEW → CONFIRMED).
 */

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const LIME = "#c3f400";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
} as const;

export default function ShopPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#111508" }}>
      {/* Subtle top gradient */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "35vh",
          background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(171,214,0,0.09) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      <div className="page-container pt-20 pb-28 relative z-10">

        {/* Header */}
        <motion.div className="mb-8" {...fadeUp} transition={{ duration: 0.4 }}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "#8e9379",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}>
            Shopping
          </p>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(24px, 5vw, 30px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#e2e4cf",
            lineHeight: 1.1,
          }}>
            My Lists
          </h1>
        </motion.div>

        {/* Empty state */}
        <motion.div
          className="glass-card p-10 flex flex-col items-center gap-4 text-center"
          {...fadeUp}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          <div style={{
            width: "64px", height: "64px", borderRadius: "20px",
            background: "rgba(195,244,0,0.08)",
            border: "1px solid rgba(195,244,0,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: LIME, fontVariationSettings: "'FILL' 1" }}>
              checklist
            </span>
          </div>

          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px", fontWeight: 700, color: "#e2e4cf", marginBottom: "6px" }}>
              No lists yet
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#8e9379", lineHeight: 1.6, maxWidth: "260px" }}>
              Create a shopping list to plan your next grocery run.
            </p>
          </div>

          <button
            onClick={() => navigate("/scan")}
            style={{
              marginTop: "4px",
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 20px",
              borderRadius: "999px",
              background: LIME,
              color: "#1a2200",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(195,244,0,0.25)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px", lineHeight: 1 }}>add</span>
            New List
          </button>
        </motion.div>

        {/* Divider with quick scan CTA */}
        <motion.div
          className="mt-6 glass-card p-4 flex items-center gap-4 cursor-pointer"
          {...fadeUp}
          transition={{ delay: 0.14, duration: 0.4 }}
          onClick={() => navigate("/scan")}
          whileHover={{ x: 2 }}
        >
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
            background: "rgba(0,220,229,0.08)",
            border: "1px solid rgba(0,220,229,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#00dce5", lineHeight: 1, fontVariationSettings: "'FILL' 1" }}>
              photo_camera
            </span>
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "#e2e4cf" }}>
              Scan a bill instead
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#8e9379", marginTop: "2px" }}>
              Photograph a receipt to log instantly
            </p>
          </div>
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: "18px", color: "#444933" }}>
            chevron_right
          </span>
        </motion.div>

      </div>
    </div>
  );
}
