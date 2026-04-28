/**
 * HomePage — Main dashboard using shadcn + react-bits components.
 *
 * Uses: shadcn Card, Badge | react-bits SpotlightCard, GradientText
 * Layout: Full-width via .page-container (no max-width).
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useGreeting } from "./hooks/useGreeting";
import { formatCurrency } from "../../shared/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import GradientText from "../../shared/components/GradientText";
import SpotlightCard from "../../shared/components/SpotlightCard";

/* ── Stagger animation variants ── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/* ── Sample data (replace with API) ── */
const MONTHLY_SPEND = 8450;
const LAST_MONTH_SPEND = 7200;
const TRANSACTION_COUNT = 12;
const ITEMS_TRACKED = 34;

const RECENT_TRANSACTIONS = [
  { id: "1", title: "Weekly Groceries",    amount: 1450, date: "Today",      icon: "🛒", status: "completed" as const },
  { id: "2", title: "Mustard Oil Restock", amount: 540,  date: "2 days ago", icon: "🫒", status: "completed" as const },
  { id: "3", title: "Festival Supplies",   amount: 3200, date: "5 days ago", icon: "🎉", status: "pending" as const },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  pending: "secondary",
  failed: "destructive",
};

export default function HomePage() {
  const { greeting, name } = useGreeting();
  const spendDiff = ((MONTHLY_SPEND - LAST_MONTH_SPEND) / LAST_MONTH_SPEND) * 100;

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="page-container py-8 md:py-14"
    >
      {/* ── Greeting ── */}
      <motion.div variants={fadeUp} className="text-center mb-10">
        <h1 className="text-3xl font-extrabold md:text-5xl text-foreground">
          {greeting},{" "}
          <GradientText className="text-3xl font-extrabold md:text-5xl">{name}</GradientText> 👋
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Here's your spending overview for this month
        </p>
      </motion.div>

      {/* ── Stats row — 3 SpotlightCards ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <SpotlightCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            This Month
          </p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {formatCurrency(MONTHLY_SPEND)}
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: spendDiff > 0 ? "var(--color-danger)" : "var(--color-success)" }}>
            {spendDiff > 0 ? "↑" : "↓"} {Math.abs(spendDiff).toFixed(0)}% vs last month
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-6" spotlightColor="var(--color-accent-glow)">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transactions
          </p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {TRANSACTION_COUNT}
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Bills scanned
          </p>
        </SpotlightCard>

        <SpotlightCard className="p-6" spotlightColor="rgba(139, 92, 246, 0.2)">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Items Tracked
          </p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {ITEMS_TRACKED}
          </p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Unique products
          </p>
        </SpotlightCard>
      </motion.div>

      {/* ── Scan Bill CTA ── */}
      <motion.div variants={fadeUp} className="mb-10">
        <Link to="/scan" className="block">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="relative flex items-center justify-center gap-3 py-6 rounded-2xl cursor-pointer animate-pulse-glow overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              boxShadow: "0 8px 32px var(--color-primary-glow)",
            }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)",
                backgroundSize: "200% 100%",
                animation: "gradient-shift 3s ease-in-out infinite",
              }}
            />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
              <path d="M3 7V5a2 2 0 012-2h2" />
              <path d="M17 3h2a2 2 0 012 2v2" />
              <path d="M21 17v2a2 2 0 01-2 2h-2" />
              <path d="M7 21H5a2 2 0 01-2-2v-2" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
            <span className="relative z-10 text-xl font-bold text-white">Scan a Bill</span>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Recent transactions with shadcn Card ── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">
            Recent Transactions
          </h2>
          <Link to="/transactions">
            <Button variant="ghost" size="sm">View all →</Button>
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {RECENT_TRANSACTIONS.map((tx) => (
            <motion.div key={tx.id} variants={fadeUp}>
              <Card className="backdrop-blur-lg border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                <CardContent className="flex items-center gap-4 px-5 py-5">
                  {/* Icon badge */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ background: "var(--color-primary-glow)" }}
                  >
                    {tx.icon}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold truncate text-foreground">
                      {tx.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tx.date}
                    </p>
                  </div>
                  {/* Status badge (shadcn) */}
                  <Badge variant={statusVariant[tx.status]} className="capitalize">
                    {tx.status}
                  </Badge>
                  <Separator orientation="vertical" className="h-8" />
                  {/* Amount */}
                  <p className="text-xl font-bold shrink-0 text-foreground">
                    {formatCurrency(tx.amount)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
