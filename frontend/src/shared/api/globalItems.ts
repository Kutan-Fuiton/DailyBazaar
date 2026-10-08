import client from "./client";

export interface GlobalItem {
  id: number;
  name: string;
  hindi_name?: string | null;
  bengali_name?: string | null;
  category: string;
  sub_category?: string | null;
  brand?: string | null;
  barcode?: string | null;
  default_unit: string;
  unit_family: string;
  price_per_unit?: number | null;
  mrp?: number | null;
  typical_price_range?: string | null;
  emoji?: string | null;
  description?: string | null;
  storage_type?: string | null;
  shelf_life?: string | null;
  aliases?: string | null;
  nutrition_notes?: string | null;
  is_seasonal?: boolean;
  season?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GlobalItemInput {
  name: string;
  hindi_name?: string;
  bengali_name?: string;
  category: string;
  sub_category?: string;
  brand?: string;
  barcode?: string;
  default_unit: string;
  unit_family: string;
  price_per_unit?: number;
  mrp?: number;
  typical_price_range?: string;
  emoji?: string;
  description?: string;
  storage_type?: string;
  shelf_life?: string;
  aliases?: string;
  nutrition_notes?: string;
  is_seasonal?: boolean;
  season?: string;
}

export interface GlobalItemListResponse {
  total: number;
  page: number;
  page_size: number;
  items: GlobalItem[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export const globalItemsApi = {
  list: (params?: {
    search?: string;
    category?: string;
    brand?: string;
    unit_family?: string;
    page?: number;
    page_size?: number;
    sort_by?: string;
    order?: "asc" | "desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    if (params?.brand) q.append("brand", params.brand);
    if (params?.unit_family) q.append("unit_family", params.unit_family);
    if (params?.page) q.append("page", String(params.page));
    if (params?.page_size) q.append("page_size", String(params.page_size));
    if (params?.sort_by) q.append("sort_by", params.sort_by);
    if (params?.order) q.append("order", params.order);
    const queryString = q.toString();
    return client<GlobalItemListResponse>(`/global-items${queryString ? `?${queryString}` : ""}`);
  },

  getCategories: () =>
    client<CategoryCount[]>("/global-items/categories"),

  getById: (id: number) =>
    client<GlobalItem>(`/global-items/${id}`),

  create: (item: GlobalItemInput) =>
    client<GlobalItem>("/global-items", {
      method: "POST",
      body: item,
    }),

  update: (id: number, item: Partial<GlobalItemInput>) =>
    client<GlobalItem>(`/global-items/${id}`, {
      method: "PUT",
      body: item,
    }),

  delete: (id: number) =>
    client<{ message: string }>(`/global-items/${id}`, {
      method: "DELETE",
    }),

  bulkCreate: (items: GlobalItemInput[]) =>
    client<{
      message: string;
      inserted_count: number;
      skipped_count: number;
      inserted: string[];
      skipped: string[];
    }>("/global-items/bulk", {
      method: "POST",
      body: { items },
    }),
};
