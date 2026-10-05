/**
 * useDraftList.ts — Draft shopping list persistence hook.
 *
 * Implements two-layer draft persistence:
 *   Layer 1 — localStorage (immediate, zero-latency)
 *   Layer 2 — Server DRAFT list (durable, synced in background)
 *
 * Usage:
 *   const { listId, items, addItem, removeItem, updateItem, confirmList, clearDraft } = useDraftList("notepad");
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { shoppingListsApi } from "../api/shoppingLists";
import type { ListItemCreate, ListItem } from "../types";

export type DraftMode = "notepad" | "manual" | "scan";

export interface DraftItem extends ListItemCreate {
  _tempId: string;        // client-side temp ID for optimistic UI
  serverId?: number;      // set once synced to server
  backendId?: number;     // legacy alias for serverId
  is_bought?: boolean;
  confidence?: string;    // "high" | "medium" | "low"
  emoji?: string;
  user_last_price?: number | null;
  market_price?: number | null;
  suggested_price?: number | null;
  ambiguous?: boolean;    // LOW confidence flag
  shop?: string | null;   // Shop / Dokan tag for this item
  raw?: string | null;    // original text typed on canvas
  isEnriched?: boolean;   // whether database/market prices have been resolved
  isEnriching?: boolean;  // currently in-flight background enrichment
}

interface UseDraftListReturn {
  listId: number | null;
  items: DraftItem[];
  isDraft: boolean;
  isCreating: boolean;
  addItem: (item: Omit<DraftItem, "_tempId">) => Promise<void>;
  removeItem: (tempId: string) => Promise<void>;
  updateItem: (tempId: string, patch: Partial<DraftItem>) => void;
  saveList: () => Promise<number | null>;
  finalizeList: (opts?: { title?: string; locationId?: number }) => Promise<number | null>;
  confirmList: (opts?: { title?: string; locationId?: number }) => Promise<number | null>;
  clearDraft: () => void;
}

const LS_KEY = (mode: DraftMode) => `vaniq:draft:${mode}`;

function genId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useDraftList(mode: DraftMode): UseDraftListReturn {
  const [listId, setListId] = useState<number | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const pendingCreate = useRef<Promise<number> | null>(null);

  // ── Restore from localStorage on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY(mode));
      if (raw) {
        const saved = JSON.parse(raw) as { listId: number | null; items: DraftItem[] };
        if (saved.items?.length > 0) {
          setListId(saved.listId ?? null);
          setItems(saved.items);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [mode]);

  // ── Persist to localStorage on every change ─────────────────────────────────
  useEffect(() => {
    if (items.length === 0 && !listId) {
      localStorage.removeItem(LS_KEY(mode));
      return;
    }
    try {
      localStorage.setItem(LS_KEY(mode), JSON.stringify({ listId, items }));
    } catch {
      // ignore storage quota errors
    }
  }, [listId, items, mode]);

  // ── Ensure backend DRAFT list exists ───────────────────────────────────────
  const ensureList = useCallback(async (): Promise<number> => {
    if (listId) return listId;

    // If a creation is already in flight, wait for it
    if (pendingCreate.current) return pendingCreate.current;

    setIsCreating(true);
    pendingCreate.current = shoppingListsApi
      .create({ title: `Draft ${mode} list` })
      .then((list) => {
        setListId(list.id);
        pendingCreate.current = null;
        setIsCreating(false);
        return list.id;
      })
      .catch((err) => {
        pendingCreate.current = null;
        setIsCreating(false);
        throw err;
      });

    return pendingCreate.current;
  }, [listId, mode]);

  // ── Auto-sync offline draft items when connection is restored ───────────────
  useEffect(() => {
    const handleReconnect = async () => {
      const unsynced = items.filter((it) => !it.serverId && !it.backendId);
      if (unsynced.length === 0) return;

      try {
        const id = await ensureList();
        for (const item of unsynced) {
          const payload: ListItemCreate = {
            name: item.name,
            quantity: item.quantity ?? 1,
            unit: item.unit ?? null,
            user_price: item.user_price ?? item.suggested_price ?? null,
            source: mode,
            shop: item.shop ?? null,
          };
          const serverItem = await shoppingListsApi.addItem(id, payload);
          setItems((prev) =>
            prev.map((it) =>
              it._tempId === item._tempId
                ? { ...it, serverId: serverItem.id, backendId: serverItem.id }
                : it
            )
          );
        }
      } catch {
        // Will retry on next reconnect event
      }
    };

    window.addEventListener("online", handleReconnect);
    return () => window.removeEventListener("online", handleReconnect);
  }, [items, ensureList, mode]);

  // ── Add item ───────────────────────────────────────────────────────────────
  const addItem = useCallback(
    async (itemData: Omit<DraftItem, "_tempId">) => {
      const tempId = genId();
      const draft: DraftItem = { ...itemData, _tempId: tempId };

      // Optimistically append
      setItems((prev) => [...prev, draft]);

      try {
        const id = await ensureList();
        const payload: ListItemCreate = {
          name: itemData.name,
          quantity: itemData.quantity ?? 1,
          unit: itemData.unit ?? null,
          user_price: itemData.user_price ?? itemData.suggested_price ?? null,
          source: mode,
          shop: itemData.shop ?? null,
        };
        const serverItem: ListItem = await shoppingListsApi.addItem(id, payload);

        // Update with durable server ID
        setItems((prev) =>
          prev.map((it) =>
            it._tempId === tempId ? { ...it, serverId: serverItem.id, backendId: serverItem.id } : it
          )
        );
      } catch {
        // Silently keep local item — will sync on next retry
      }
    },
    [ensureList, mode]
  );

  // ── Remove item ────────────────────────────────────────────────────────────
  const removeItem = useCallback(
    async (tempId: string) => {
      const item = items.find((it) => it._tempId === tempId);
      setItems((prev) => prev.filter((it) => it._tempId !== tempId));

      const itemIdOnServer = item?.serverId || item?.backendId;
      if (itemIdOnServer && listId) {
        try {
          await shoppingListsApi.deleteItem(listId, itemIdOnServer);
        } catch {
          // ignore — local state is already removed
        }
      }
    },
    [items, listId]
  );

  // ── Update item locally (no immediate server round-trip) ────────────────────
  const updateItem = useCallback((tempId: string, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((it) => (it._tempId === tempId ? { ...it, ...patch } : it))
    );
  }, []);

  // ── Clear draft ────────────────────────────────────────────────────────────
  const clearDraft = useCallback(() => {
    setListId(null);
    setItems([]);
    localStorage.removeItem(LS_KEY(mode));
  }, [mode]);

  // ── Save list (for planning) ───────────────────────────────────────────────
  const saveList = useCallback(
    async (): Promise<number | null> => {
      if (!listId) return null;
      try {
        await shoppingListsApi.updateStatus(listId, "SAVED");
      } catch {}
      clearDraft();
      return listId;
    },
    [listId, clearDraft]
  );

  // ── Finalize list into completed Transaction ────────────────────────────────
  const finalizeList = useCallback(
    async (opts?: { title?: string; locationId?: number }): Promise<number | null> => {
      if (!listId) return null;
      try {
        await shoppingListsApi.markAllBought(listId);
        const result = await shoppingListsApi.finalize(listId, {
          title: opts?.title,
          location_id: opts?.locationId ?? null,
        });
        clearDraft();
        return result.transaction_id;
      } catch {
        return null;
      }
    },
    [listId, clearDraft]
  );

  // Alias confirmList to saveList
  const confirmList = saveList;

  return {
    listId,
    items,
    isDraft: items.length > 0,
    isCreating,
    addItem,
    removeItem,
    updateItem,
    saveList,
    finalizeList,
    confirmList,
    clearDraft,
  };
}
