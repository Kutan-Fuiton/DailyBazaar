import { useMemo } from "react";
import type { Transaction } from "../TransactionsPage";

/**
 * Filter transactions by a search query (matches title, case-insensitive).
 */
export function useFilteredTransactions(transactions: Transaction[], query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => tx.title.toLowerCase().includes(q));
  }, [transactions, query]);
}
