/**
 * TransactionCard — Single transaction with shadcn Card + Badge.
 *
 * Glass card with hover effects, color-coded status badge.
 */

import { motion } from "framer-motion";
import { formatCurrency, formatDate } from "../../../shared/utils";
import type { Transaction } from "../TransactionsPage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  transaction: Transaction;
}

const statusVariant: Record<Transaction["status"], "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  pending: "secondary",
  failed: "destructive",
};

export default function TransactionCard({ transaction }: Props) {
  const { title, amount, date, status } = transaction;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="backdrop-blur-lg border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
        <CardContent className="flex items-center justify-between px-6 py-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatDate(date)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant[status]} className="capitalize">
              {status}
            </Badge>
            <Separator orientation="vertical" className="h-8" />
            <span className="text-xl font-bold text-foreground">
              {formatCurrency(amount)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
