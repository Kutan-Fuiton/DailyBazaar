import { motion } from "framer-motion";

const LIME = "#c3f400";
const SURFACE_CARD = "rgba(26, 31, 15, 0.75)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.14)";

const FEATURES = [
  {
    icon: "document_scanner",
    title: "Instant Bill OCR",
    desc: "Scan handwritten bazaar chits or supermarket slips. DailyBazaar extracts item names, weights (kg/g), and prices automatically.",
    tag: "High Accuracy",
  },
  {
    icon: "monitoring",
    title: "Price Intelligence",
    desc: "Track daily rate fluctuations on essentials like vegetables, dairy, and spices with automatic inflation indices and savings hints.",
    tag: "Smart Analytics",
  },
  {
    icon: "translate",
    title: "Self-Learning Lexicon",
    desc: "Learns regional bazaar spellings in Bengali, Hindi, and colloquial English. Correcting an item once trains the scanner forever.",
    tag: "Adaptive AI",
  },
  {
    icon: "offline_pin",
    title: "Persistent State & Drafts",
    desc: "Switch between tabs or close your browser without stress. Your bills, notes, and shopping checklists stay right where you left them.",
    tag: "Zero Data Loss",
  },
];

export default function PublicitySection() {
  return (
    <section className="w-full my-10">
      <div className="text-center mb-6">
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(20px, 4vw, 24px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#e2e4cf",
            marginBottom: "6px",
          }}
        >
          Built for the Local Bazaar<span style={{ color: LIME }}>.</span>
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "#8e9379",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          Traditional grocery apps don't understand Indian vegetable markets. DailyBazaar does.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {FEATURES.map((feat, i) => (
          <motion.div
            key={feat.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="glass-card p-4 rounded-2xl flex flex-col justify-between relative group hover:border-[#c3f400]/40 transition-colors duration-200"
            style={{
              background: SURFACE_CARD,
              border: `1px solid ${BORDER_COLOR}`,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "rgba(195, 244, 0, 0.10)",
                    border: "1px solid rgba(195, 244, 0, 0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: LIME,
                  }}
                >
                  <span className="material-symbols-outlined text-xl">{feat.icon}</span>
                </div>

                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    color: LIME,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(195, 244, 0, 0.08)",
                    border: "1px solid rgba(195, 244, 0, 0.18)",
                  }}
                >
                  {feat.tag}
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#e2e4cf",
                  marginBottom: "4px",
                }}
              >
                {feat.title}
              </h3>

              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                  color: "#8e9379",
                  lineHeight: 1.45,
                }}
              >
                {feat.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
