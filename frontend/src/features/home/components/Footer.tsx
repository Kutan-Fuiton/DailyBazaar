import { useNavigate } from "react-router-dom";

const LIME = "#c3f400";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="w-full mt-14 pt-8 pb-16 relative overflow-hidden">
      {/* Top green gradient divider */}
      <div
        className="w-full h-[1px] mb-8"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(195, 244, 0, 0.4) 50%, transparent 100%)",
        }}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2 text-center md:text-left">
        {/* Brand identity */}
        <div className="flex flex-col items-center md:items-start">
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => navigate("/home")}
          >
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "#e2e4cf",
                letterSpacing: "-0.02em",
              }}
            >
              DailyBazaar
            </span>
            <span style={{ color: LIME, fontSize: "18px", fontWeight: 800 }}>.</span>
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "#8e9379",
              marginTop: "4px",
              maxWidth: "280px",
            }}
          >
            Intelligent bazaar price tracking and OCR receipt digitization.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-[#8e9379]">
          <button
            onClick={() => navigate("/scan?mode=scan")}
            className="hover:text-[#c3f400] transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            Scan Bill
          </button>
          <button
            onClick={() => navigate("/scan?mode=notepad")}
            className="hover:text-[#c3f400] transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            Quick Notepad
          </button>
          <button
            onClick={() => navigate("/shop")}
            className="hover:text-[#c3f400] transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            Shopping Lists
          </button>
          <button
            onClick={() => navigate("/profile?tab=history")}
            className="hover:text-[#c3f400] transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            Purchases
          </button>
        </div>

        {/* Social media handles */}
        <div className="flex items-center gap-3">
          {/* X / Twitter */}
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            title="X / Twitter"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "rgba(195, 244, 0, 0.06)",
              border: "1px solid rgba(195, 244, 0, 0.18)",
              color: "#e2e4cf",
            }}
          >
            <span className="text-xs font-bold font-sans">𝕏</span>
          </a>

          {/* Instagram */}
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "rgba(195, 244, 0, 0.06)",
              border: "1px solid rgba(195, 244, 0, 0.18)",
              color: LIME,
            }}
          >
            <span className="material-symbols-outlined text-sm">photo_camera</span>
          </a>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "rgba(195, 244, 0, 0.06)",
              border: "1px solid rgba(195, 244, 0, 0.18)",
              color: "#e2e4cf",
            }}
          >
            <span className="material-symbols-outlined text-sm">code</span>
          </a>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            color: "#606552",
          }}
        >
          © {new Date().getFullYear()} DailyBazaar · Built with <span style={{ color: LIME }}>♥</span> in India
        </p>
      </div>
    </footer>
  );
}
