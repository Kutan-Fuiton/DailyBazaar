/**
 * DualScopeSuggestions.tsx — Two-Tier Suggestions Dropdown for Notepad.
 *
 * Provides:
 * 1. 🌍 Global Database suggestions (Canonical lexicon items + benchmark market prices)
 * 2. 👤 Your Database suggestions (User catalog items + latest purchase history prices)
 */

import { useEffect, useState, useRef } from "react";
import { suggestionsApi, type DualSuggestionItem } from "../../../shared/api/suggestions";
import { History, Globe } from "lucide-react";

interface DualScopeSuggestionsProps {
  query: string;
  onSelect: (item: DualSuggestionItem) => void;
  onClose: () => void;
}

export default function DualScopeSuggestions({ query, onSelect, onClose }: DualScopeSuggestionsProps) {
  const [globalList, setGlobalList] = useState<DualSuggestionItem[]>([]);
  const [personalList, setPersonalList] = useState<DualSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "personal" | "global">("all");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 1) {
      setGlobalList([]);
      setPersonalList([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await suggestionsApi.search(trimmed, 6);
        if (!cancelled && res) {
          setGlobalList(res.global_suggestions || []);
          setPersonalList(res.personal_suggestions || []);
        }
      } catch (err) {
        console.error("Suggestions search error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  // Outside click to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const totalResults = globalList.length + personalList.length;
  if (!query.trim() || (totalResults === 0 && !loading)) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 top-full mt-2 rounded-2xl p-2 z-50 shadow-2xl backdrop-blur-xl overflow-hidden"
      style={{
        background: "rgba(18, 22, 10, 0.95)",
        border: "1px solid rgba(195, 244, 0, 0.25)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
        maxHeight: "380px",
        overflowY: "auto",
      }}
    >
      {/* Scope Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 mb-2 rounded-xl bg-black/40 border border-white/5 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-1 px-2 rounded-lg transition-colors ${
            activeTab === "all" ? "bg-[#c3f400] text-[#111508]" : "text-[#8e9379] hover:text-[#e2e4cf]"
          }`}
          style={{ cursor: "pointer", border: "none" }}
        >
          All ({totalResults})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={`flex-1 py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "personal" ? "bg-[#c3f400] text-[#111508]" : "text-[#8e9379] hover:text-[#e2e4cf]"
          }`}
          style={{ cursor: "pointer", border: "none" }}
        >
          <History className="w-3.5 h-3.5" />
          <span>Your History</span>
          <span>({personalList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("global")}
          className={`flex-1 py-1 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "global" ? "bg-[#c3f400] text-[#111508]" : "text-[#8e9379] hover:text-[#e2e4cf]"
          }`}
          style={{ cursor: "pointer", border: "none" }}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Market Staples</span>
          <span>({globalList.length})</span>
        </button>
      </div>

      {loading && (
        <div className="py-3 text-center text-xs text-[#8e9379] flex items-center justify-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-[#c3f400]/40 border-t-[#c3f400] animate-spin" />
          <span>Searching market staples & your purchase history…</span>
        </div>
      )}

      {/* ── 1. Personal History Section ── */}
      {(activeTab === "all" || activeTab === "personal") && personalList.length > 0 && (
        <div className="mb-2">
          <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-[#8e9379] flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#c3f400]" />
            <span>Your Previous Purchases</span>
          </div>
          <div className="flex flex-col gap-1">
            {personalList.map((item, idx) => (
              <button
                key={`p-${item.id || idx}`}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left transition-all hover:bg-white/5 group"
                style={{
                  background: "rgba(195,244,0,0.04)",
                  border: "1px solid rgba(195,244,0,0.12)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg">{item.emoji || "🥬"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e2e4cf] group-hover:text-[#c3f400] transition-colors truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-[#8e9379]">{item.subtitle}</p>
                  </div>
                </div>

                {item.price != null && (
                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-bold font-mono text-[#c3f400]">
                      ₹{Math.round(item.price)}
                    </span>
                    <span className="text-[10px] text-[#8e9379]">/{item.unit || "unit"}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. Global Lexicon Section ── */}
      {(activeTab === "all" || activeTab === "global") && globalList.length > 0 && (
        <div>
          <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-[#8e9379] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#00dce5]" />
            <span>Global Bazaar Catalog</span>
          </div>
          <div className="flex flex-col gap-1">
            {globalList.map((item, idx) => (
              <button
                key={`g-${item.id || idx}`}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left transition-all hover:bg-white/5 group"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg">{item.emoji || "🥬"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e2e4cf] group-hover:text-[#c3f400] transition-colors truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-[#8e9379]">{item.subtitle}</p>
                  </div>
                </div>

                {item.price != null && (
                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-bold font-mono text-[#00dce5]">
                      ₹{Math.round(item.price)}
                    </span>
                    <span className="text-[10px] text-[#8e9379]">/{item.unit || "kg"} avg</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
