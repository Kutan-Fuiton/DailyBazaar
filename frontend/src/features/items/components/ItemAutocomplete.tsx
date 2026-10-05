import { useState, useRef, useEffect } from "react";
import type { Item } from "../../../shared/types";
import { formatCurrency } from "../../../shared/utils";

interface ItemAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: Item) => void;
  items: Item[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function ItemAutocomplete({
  value,
  onChange,
  onSelect,
  items,
  placeholder = "Search or type item name…",
  className = "",
  autoFocus = false,
}: ItemAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? items.filter((item) => {
        const query = value.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.aliases?.some((a) => a.alias.toLowerCase().includes(query))
        );
      }).slice(0, 6)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (value.trim()) setIsOpen(true);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm focus:outline-none focus:border-lime-400 ${className}`}
      />

      {isOpen && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl border border-white/15"
          style={{
            background: "#181c0e",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="py-1 divide-y divide-white/5 max-h-56 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  onChange(item.name);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-lime-400/10 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{item.emoji || "🏷️"}</span>
                  <div className="truncate">
                    <span className="text-xs font-bold text-white group-hover:text-lime-300 transition block truncate">
                      {item.name}
                    </span>
                    {item.category && (
                      <span className="text-[10px] font-mono text-[#8e9379]">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
                {item.price_per_unit != null && (
                  <span className="text-xs font-mono font-semibold text-lime-400 flex-shrink-0 ml-2">
                    {formatCurrency(item.price_per_unit)}
                    {item.unit ? `/${item.unit}` : ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
