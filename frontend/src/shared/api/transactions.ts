import client from "./client";
import type { Transaction, TransactionCreate } from "../types";

export const transactionsApi = {
  list: (params?: { status?: string; search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.skip != null) qs.set("skip", String(params.skip));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs}` : "";
    return client<Transaction[]>(`/transactions${query}`);
  },

  create: (data: TransactionCreate) =>
    client<Transaction>("/transactions", { method: "POST", body: data }),

  get: (id: number) => client<Transaction>(`/transactions/${id}`),

  update: (id: number, data: { title?: string; location_id?: number | null }) =>
    client<Transaction>(`/transactions/${id}`, { method: "PATCH", body: data }),

  delete: (id: number) =>
    client<void>(`/transactions/${id}`, { method: "DELETE" }),
};
