import { useState, useEffect } from "react";
import { statsApi, type SearchItemResult } from "../../../shared/api/stats";
import { User, Globe, X } from "lucide-react";

const LIME = "#c3f400";
const SURFACE_CARD = "rgba(26, 31, 15, 0.85)";
const BORDER_COLOR = "rgba(195, 244, 0, 0.16)";

interface ItemSearchSectionProps {
  onSelectItem: (itemId: number) => void;
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 52, H = 20, pad = 2;
  const pts = data.map((p, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const isUp = data[data.length - 1] > data[0];
  const color = isUp ? "#ffb4ab" : LIME;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-14 h-5">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ItemSearchSection({ onSelectItem }: ItemSearchSectionProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "personal" | "global">("all");
  const [results, setResults] = useState<SearchItemResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await statsApi.search(query, scope, 24);
        if (!cancelled) setResults(data || []);
      } catch (err) {
        console.error("Failed to search stats items:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, scope]);

  return (
    <div
      className="glass-card p-5 rounded-2xl"
      style={{
        background: SURFACE_CARD,
        border: `1px solid ${BORDER_COLOR}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "#e2e4cf",
            }}
          >
            Item Price Search
          </h3>
          <p style={{ fontSize: "11px", color: "#8e9379" }}>
            Compare personal purchase history against global market averages
          </p>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-[11px] font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`py-1 px-2.5 rounded-lg transition-colors ${
              scope === "all" ? "bg-[#c3f400] text-[#111508]" : "text-[#8e9379] hover:text-[#e2e4cf]"
            }`}
            style={{ cursor: "pointer", border: "none" }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setScope("personal")}
            className={`py-1 px-2.5 rounded-lg transition-colors ${
              scope === "personal" ? "bg-[#c3f400] text-[#111508]" : "text-[#8e9379] hover:text-[#e2e4cf]"
            }`}
            style={{ cursor: "pointer", border: "none" }}
          >
            <span className="inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> My Catalog
            </span>
          </button>
          <button
            type="button"
            onClick={() => setScope("global")}
            className={`py-1 px-2.5 rounded-lg transition-colors ${
              scope === "global" ? "bg-[#c3f400] text-[#111508]" : "text-[#8e9379] hover:text-[#e2e4cf]"
            }`}
            style={{ cursor: "pointer", border: "none" }}
          >
            <span className="inline-flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Global DB
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg"
          style={{ color: "#8e9379" }}
        >
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any vegetable, fruit, spice (e.g. Onion, Alu, Mustard oil)…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:border-[#c3f400]"
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e4cf",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8e9379] hover:text-white flex items-center justify-center p-1"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#8e9379]">
          No items matching "{query}". Try a regional name or switch scope.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
          {results.map((item) => {
            const isPersonal = item.source === "personal";
            return (
              <div
                key={`${item.source}-${item.id || item.name}`}
                onClick={() => item.id && onSelectItem(item.id)}
                className="glass-card p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:border-[#c3f400]/40 transition-all group"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl">{item.emoji || "🥬"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e2e4cf] group-hover:text-[#c3f400] transition-colors truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-[#8e9379] truncate">
                      {item.bengali_name || item.hindi_name
                        ? `${item.bengali_name || ""} ${item.hindi_name ? `(${item.hindi_name})` : ""}`
                        : item.category}
                    </p>
                    <span
                      className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold"
                      style={{
                        background: isPersonal ? "rgba(195,244,0,0.1)" : "rgba(0,220,229,0.1)",
                        color: isPersonal ? LIME : "#00dce5",
                      }}
                    >
                      {isPersonal ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> {item.purchase_count}x bought
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Global DB
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  {item.avg_price != null ? (
                    <>
                      <span className="text-xs font-bold font-mono text-[#e2e4cf]">
                        ₹{Math.round(item.avg_price)}
                      </span>
                      <span className="text-[10px] text-[#8e9379]">/{item.unit || "kg"}</span>
                      {item.sparkline.length > 1 && (
                        <div className="mt-1">
                          <MiniSparkline data={item.sparkline} />
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-[#8e9379]">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
