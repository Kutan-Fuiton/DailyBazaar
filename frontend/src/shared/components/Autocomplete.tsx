/**
 * Autocomplete.tsx — Reusable keyboard-navigable autocomplete dropdown.
 *
 * Features:
 * - 200ms debounce on keystroke before API call
 * - Arrow key navigation + Enter/Tab to accept
 * - Shows alias → Canonical resolution with grey arrow
 * - Price badge per suggestion
 * - Source badge (personal / alias / global)
 * - Animates in/out smoothly
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { itemsApi, type AutocompleteItem } from "../api/items";
import "./Autocomplete.css";

export interface AutocompleteProps {
  /** Controlled input value */
  value: string;
  onChange: (value: string) => void;
  /** Called when user selects a suggestion */
  onSelect: (item: AutocompleteItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Callback when Enter is pressed and nothing is selected from list */
  onEnter?: () => void;
}

const SOURCE_LABELS: Record<AutocompleteItem["source"], string> = {
  alias: "alias",
  personal: "my items",
  global: "global",
};

const SOURCE_COLORS: Record<AutocompleteItem["source"], string> = {
  alias: "var(--ac-alias)",
  personal: "var(--ac-personal)",
  global: "var(--ac-global)",
};

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Type an item…",
  className = "",
  disabled = false,
  autoFocus = false,
  onEnter,
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const items = await itemsApi.autocomplete(q, 8);
      setSuggestions(items);
      setOpen(items.length > 0);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    if (!value) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    _debounceTimer = setTimeout(() => fetchSuggestions(value), 200);
    return () => {
      if (_debounceTimer) clearTimeout(_debounceTimer);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "Enter") {
        e.preventDefault();
        onEnter?.();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        if (activeIdx >= 0 && suggestions[activeIdx]) {
          accept(suggestions[activeIdx]);
        } else {
          setOpen(false);
          onEnter?.();
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIdx(-1);
        break;
    }
  };

  const accept = (item: AutocompleteItem) => {
    onChange(item.canonical);
    onSelect(item);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  const formatPrice = (price: number | null, unit: string | null) => {
    if (!price) return null;
    const u = unit || "unit";
    return `₹${price}/${u}`;
  };

  return (
    <div className={`ac-root ${className}`}>
      <div className="ac-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="ac-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <span className="ac-spinner" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="ac-list" ref={listRef} role="listbox">
          {suggestions.map((item, idx) => {
            const isAlias = item.display.toLowerCase() !== item.canonical.toLowerCase();
            const isActive = idx === activeIdx;
            return (
              <li
                key={`${item.canonical}-${idx}`}
                className={`ac-item ${isActive ? "ac-item--active" : ""}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => { e.preventDefault(); accept(item); }}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <span className="ac-emoji">{item.emoji}</span>
                <span className="ac-names">
                  <span className="ac-display">{item.display}</span>
                  {isAlias && (
                    <span className="ac-resolution">
                      → <strong>{item.canonical}</strong>
                    </span>
                  )}
                </span>
                <span className="ac-meta">
                  {item.price && (
                    <span className="ac-price">{formatPrice(item.price, item.unit)}</span>
                  )}
                  <span
                    className="ac-source"
                    style={{ backgroundColor: SOURCE_COLORS[item.source] }}
                  >
                    {SOURCE_LABELS[item.source]}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Autocomplete;
