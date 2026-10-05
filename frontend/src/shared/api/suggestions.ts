import client from "./client";

export interface DualSuggestionItem {
  id?: number | null;
  name: string;
  price?: number | null;
  unit?: string | null;
  emoji?: string | null;
  category?: string | null;
  source: "global" | "personal";
  subtitle?: string | null;
}

export interface DualSuggestionResponse {
  query: string;
  global_suggestions: DualSuggestionItem[];
  personal_suggestions: DualSuggestionItem[];
}

export const suggestionsApi = {
  search: (query: string, limit = 6) => {
    const qs = new URLSearchParams({ q: query, limit: String(limit) });
    return client<DualSuggestionResponse>(`/suggestions/search?${qs}`);
  },
};
