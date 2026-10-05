import client from "./client";

export interface MonthlySpendingPoint {
  month_key: string;
  label: string;
  total: number;
  transactions_count: number;
}

export interface TopItemStat {
  id: number | null;
  name: string;
  emoji?: string;
  category?: string;
  purchase_count: number;
  total_spent: number;
  avg_price: number;
  unit?: string;
}

export interface StatsOverviewResponse {
  monthly_spending: MonthlySpendingPoint[];
  top_items: TopItemStat[];
  total_spent_all_time: number;
  total_transactions_count: number;
  total_unique_items: number;
}

export interface SearchItemResult {
  id: number | null;
  name: string;
  bengali_name?: string | null;
  hindi_name?: string | null;
  category?: string;
  emoji?: string;
  unit?: string;
  avg_price?: number | null;
  purchase_count: number;
  source: "personal" | "global";
  sparkline: number[];
}

export interface LocationPriceComparison {
  location: string;
  price: number;
}

export interface ItemFullStats {
  id: number;
  name: string;
  bengali_name?: string | null;
  hindi_name?: string | null;
  category?: string;
  emoji?: string;
  unit?: string;
  avg_price?: number | null;
  is_global: boolean;
  price_history: { date: string; price: number }[];
  locations: LocationPriceComparison[];
  purchase_count: number;
  total_spent: number;
}

export const statsApi = {
  overview: () => client<StatsOverviewResponse>("/stats/overview"),

  search: (q = "", scope = "all", limit = 30) => {
    const qs = new URLSearchParams({ q, scope, limit: String(limit) });
    return client<SearchItemResult[]>(`/stats/search?${qs}`);
  },

  itemDetails: (itemId: number) => client<ItemFullStats>(`/stats/item/${itemId}`),
};
