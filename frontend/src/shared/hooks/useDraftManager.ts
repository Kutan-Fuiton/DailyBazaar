/**
 * useDraftManager.ts — Unified Draft & Quick-Access state management.
 *
 * Provides persistent, reactive draft handling for:
 * 1. 📷 Scan Draft (OCR scan in progress, parsed items, title, confidence)
 * 2. 🛒 List Draft (Active shopping list draft)
 * 3. 📝 Notepad Draft (Raw notepad text buffer + parsed checklist items)
 *
 * Plus active option mode ("scan" | "list" | "notepad"), defaulting to "scan".
 */

import { useState, useEffect, useCallback } from "react";

export type QuickMode = "scan" | "list" | "notepad";

export interface ScanDraftItem {
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
}

export interface ScanDraft {
  scanId: number | null;
  title: string;
  confidence: number;
  items: ScanDraftItem[];
  rawText?: string;
  totalAmount?: number | null;
  savedAt: number;
}

const KEYS = {
  MODE: "vaniq:quick_action:mode",
  SCAN: "vaniq:draft:scan",
  LIST: "vaniq:draft:notepad", // shared key used by useDraftList for notepad/items
  NOTEPAD_TEXT: "vaniq:draft:notepad_raw_text",
} as const;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("vaniq:draft_change", { detail: { key } }));
  } catch {
    // ignore quota errors
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("vaniq:draft_change", { detail: { key } }));
  } catch {}
}

export function useDraftManager() {
  const [mode, setModeState] = useState<QuickMode>(() => {
    try {
      const saved = localStorage.getItem(KEYS.MODE);
      if (saved === "scan" || saved === "list") {
        return saved;
      }
      if (saved === "notepad") {
        return "list";
      }
    } catch {}
    return "scan";
  });

  const [scanDraft, setScanDraftState] = useState<ScanDraft | null>(() =>
    readStorage<ScanDraft | null>(KEYS.SCAN, null)
  );

  const [notepadText, setNotepadTextState] = useState<string>(() => {
    try {
      return localStorage.getItem(KEYS.NOTEPAD_TEXT) || "";
    } catch {
      return "";
    }
  });

  const [hasListDraft, setHasListDraft] = useState<boolean>(() => {
    const d = readStorage<{ items?: any[] } | null>(KEYS.LIST, null);
    return Boolean(d?.items && d.items.length > 0);
  });

  // Sync state on custom event or window storage change
  const syncAll = useCallback(() => {
    try {
      const savedMode = localStorage.getItem(KEYS.MODE) as QuickMode;
      if (savedMode === "scan" || savedMode === "list" || savedMode === "notepad") {
        setModeState(savedMode);
      }
      setScanDraftState(readStorage<ScanDraft | null>(KEYS.SCAN, null));
      setNotepadTextState(localStorage.getItem(KEYS.NOTEPAD_TEXT) || "");
      const d = readStorage<{ items?: any[] } | null>(KEYS.LIST, null);
      setHasListDraft(Boolean(d?.items && d.items.length > 0));
    } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener("vaniq:draft_change", syncAll);
    window.addEventListener("storage", syncAll);
    return () => {
      window.removeEventListener("vaniq:draft_change", syncAll);
      window.removeEventListener("storage", syncAll);
    };
  }, [syncAll]);

  const setMode = useCallback((newMode: QuickMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(KEYS.MODE, newMode);
      window.dispatchEvent(new CustomEvent("vaniq:draft_change", { detail: { key: KEYS.MODE } }));
    } catch {}
  }, []);

  const saveScanDraft = useCallback((draft: Omit<ScanDraft, "savedAt">) => {
    if (!draft.items || draft.items.length === 0) {
      removeStorage(KEYS.SCAN);
      setScanDraftState(null);
      return;
    }
    const fullDraft: ScanDraft = { ...draft, savedAt: Date.now() };
    writeStorage(KEYS.SCAN, fullDraft);
    setScanDraftState(fullDraft);
  }, []);

  const clearScanDraft = useCallback(() => {
    removeStorage(KEYS.SCAN);
    setScanDraftState(null);
  }, []);

  const saveNotepadText = useCallback((text: string) => {
    try {
      if (!text.trim()) {
        localStorage.removeItem(KEYS.NOTEPAD_TEXT);
      } else {
        localStorage.setItem(KEYS.NOTEPAD_TEXT, text);
      }
      setNotepadTextState(text);
      window.dispatchEvent(new CustomEvent("vaniq:draft_change", { detail: { key: KEYS.NOTEPAD_TEXT } }));
    } catch {}
  }, []);

  const clearNotepadText = useCallback(() => {
    try {
      localStorage.removeItem(KEYS.NOTEPAD_TEXT);
      setNotepadTextState("");
      window.dispatchEvent(new CustomEvent("vaniq:draft_change", { detail: { key: KEYS.NOTEPAD_TEXT } }));
    } catch {}
  }, []);

  const hasScanDraft = Boolean(scanDraft && scanDraft.items && scanDraft.items.length > 0);
  const hasNotepadDraft = Boolean(notepadText.trim().length > 0);

  return {
    mode,
    setMode,
    scanDraft,
    hasScanDraft,
    saveScanDraft,
    clearScanDraft,
    notepadText,
    hasNotepadDraft,
    saveNotepadText,
    clearNotepadText,
    hasListDraft,
  };
}
