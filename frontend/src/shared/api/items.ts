import client from "./client";
import type { Item, ItemCreate, ItemDetails, AIInsights } from "../types";

export interface AutocompleteItem {
  display: string;
  canonical: string;
  unit: string | null;
  price: number | null;
  emoji: string;
  source: "alias" | "personal" | "global";
}

export const itemsApi = {
  list: (params?: { search?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.category) qs.set("category", params.category);
    const query = qs.toString() ? `?${qs}` : "";
    return client<Item[]>(`/items${query}`);
  },

  create: (data: ItemCreate) =>
    client<Item>("/items", { method: "POST", body: data }),

  get: (id: number) => client<Item>(`/items/${id}`),

  delete: (id: number) =>
    client<void>(`/items/${id}`, { method: "DELETE" }),

  addAlias: (id: number, alias: string) =>
    client(`/items/${id}/aliases`, { method: "POST", body: { alias } }),

  deleteAlias: (id: number, aliasId: number) =>
    client<void>(`/items/${id}/aliases/${aliasId}`, { method: "DELETE" }),

  priceHistory: (id: number) =>
    client(`/items/${id}/history`),

  /** Full price intelligence — history, stats, vendor comparison, cadence */
  getDetails: (id: number, days: 30 | 60 | 90 = 30) =>
    client<ItemDetails>(`/items/${id}/details?days=${days}`),

  /** RAG + LLM advisory bullets (cached 24h server-side) */
  getAIInsights: (id: number) =>
    client<AIInsights>(`/items/${id}/ai-insights`),

  /** Global Master Lexicon Catalog Search (English, Bengali, Hindi) */
  listGlobal: (search?: string, category?: string) => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (category) qs.set("category", category);
    const query = qs.toString() ? `?${qs}` : "";
    return client<import("../types").GlobalCatalogItem[]>(`/items/global${query}`);
  },

  /** Add item from global catalog to personal inventory (marked Not Bought Yet) */
  importFromGlobal: (lexiconId: number) =>
    client<Item>(`/items/from-global?lexicon_id=${lexiconId}`, { method: "POST" }),

  /**
   * Fast fuzzy autocomplete — returns alias/personal/global suggestions.
   * Results cached server-side 5 min per user+prefix.
   */
  autocomplete: (q: string, limit = 8) =>
    client<AutocompleteItem[]>(`/items/autocomplete?q=${encodeURIComponent(q)}&limit=${limit}`),
};
