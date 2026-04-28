/**
 * TransactionsPage — Full bill history with search.
 *
 * Uses: shadcn Card, Badge, Input (via SearchBar) | react-bits GradientText
 */

import { useState } from "react";
import { motion } from "framer-motion";
import TransactionCard from "./components/TransactionCard";
import SearchBar from "./components/SearchBar";
import { useFilteredTransactions } from "./hooks/useFilteredTransactions";
import { Card, CardContent } from "@/components/ui/card";
import GradientText from "../../shared/components/GradientText";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: "1", title: "Weekly Groceries",    amount: 1450, date: "2026-04-27", status: "completed" },
  { id: "2", title: "Mustard Oil Restock", amount: 540,  date: "2026-04-25", status: "completed" },
  { id: "3", title: "Festival Supplies",   amount: 3200, date: "2026-04-22", status: "pending"   },
  { id: "4", title: "Milk & Dairy",        amount: 280,  date: "2026-04-20", status: "completed" },
  { id: "5", title: "Snacks Order",        amount: 620,  date: "2026-04-18", status: "failed"    },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const filtered = useFilteredTransactions(SAMPLE_TRANSACTIONS, query);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="page-container py-8 md:py-14"
    >
      <h1 className="mb-8 text-3xl font-bold text-center">
        <GradientText>Transactions</GradientText>
      </h1>

      <SearchBar value={query} onChange={setQuery} />

      {filtered.length === 0 ? (
        <Card className="mt-6 backdrop-blur-lg border-border/50">
          <CardContent className="flex items-center justify-center py-24">
            <p className="text-lg text-muted-foreground">
              {query ? "No transactions match your search." : "No transactions yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="mt-6 flex flex-col gap-3">
          {filtered.map((tx) => (
            <motion.div key={tx.id} variants={fadeUp}>
              <TransactionCard transaction={tx} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}
