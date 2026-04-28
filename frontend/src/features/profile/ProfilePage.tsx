/**
 * ProfilePage — User profile, analytics & settings.
 *
 * Uses: shadcn Card, Avatar, Badge, Separator, Input, Button
 *       + react-bits GradientText, SpotlightCard
 */

import { motion } from "framer-motion";
import { useTheme } from "../../shared/components/ThemeProvider";
import { formatCurrency } from "../../shared/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import GradientText from "../../shared/components/GradientText";
import SpotlightCard from "../../shared/components/SpotlightCard";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const MONTHLY_TREND = [
  { month: "Jan", amount: 5200 },
  { month: "Feb", amount: 6800 },
  { month: "Mar", amount: 4100 },
  { month: "Apr", amount: 8450 },
];

const CATEGORIES = [
  { name: "Groceries",     amount: 4200, color: "var(--color-primary)" },
  { name: "Oils & Spices", amount: 1800, color: "var(--color-accent)" },
  { name: "Dairy",         amount: 1200, color: "var(--color-secondary)" },
  { name: "Snacks",        amount: 1250, color: "var(--color-warning)" },
];

const maxMonthly = Math.max(...MONTHLY_TREND.map((m) => m.amount));
const totalCategory = CATEGORIES.reduce((s, c) => s + c.amount, 0);

export default function ProfilePage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="page-container py-8 md:py-14"
    >
      <h1 className="mb-8 text-3xl font-bold text-center">
        <GradientText>Profile</GradientText>
      </h1>

      {/* ── Avatar + Info (shadcn Card + Avatar) ── */}
      <motion.div variants={fadeUp} className="mb-6">
        <Card className="backdrop-blur-lg border-border/50">
          <CardContent className="flex items-center gap-5 p-6">
            <Avatar className="h-16 w-16 text-2xl">
              <AvatarFallback
                className="text-white font-bold text-xl"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
              >
                SP
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Spendly User</h2>
              <p className="text-base text-muted-foreground">user@spendly.app</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Analytics (SpotlightCard) ── */}
      <motion.div variants={fadeUp} className="mb-6">
        <SpotlightCard className="p-6" spotlightColor="var(--color-accent-glow)">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-5 text-muted-foreground">
            Spending Analytics
          </h3>

          {/* Top category */}
          <div className="mb-6 rounded-xl p-5" style={{ background: "var(--color-primary-glow)" }}>
            <p className="text-sm text-muted-foreground">Top spending category</p>
            <p className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
              Groceries — {formatCurrency(4200)}
            </p>
          </div>

          {/* Monthly trend bars */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-4 text-muted-foreground">Monthly Trend</p>
            <div className="flex items-end gap-4 h-28">
              {MONTHLY_TREND.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(m.amount / maxMonthly) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full rounded-t-lg min-h-[4px]"
                    style={{ background: "linear-gradient(to top, var(--color-primary), var(--color-accent))" }}
                  />
                  <span className="text-xs text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-5" />

          {/* Category breakdown */}
          <div>
            <p className="text-sm font-medium mb-4 text-muted-foreground">Category Breakdown</p>
            <div className="flex flex-col gap-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">{cat.name}</span>
                    <span className="font-medium text-foreground">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(cat.amount / totalCategory) * 100}%` }}
                      transition={{ duration: 0.7, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* ── Settings (shadcn Card) ── */}
      <motion.div variants={fadeUp} className="mb-8">
        <Card className="backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Theme toggle */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <span className="text-base text-muted-foreground">Theme</span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </Button>
            </div>

            {[
              { label: "Display Name", value: "Spendly User" },
              { label: "Email",        value: "user@spendly.app" },
              { label: "Currency",     value: "₹ INR" },
              { label: "Language",     value: "English" },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                className={`flex items-center justify-between px-6 py-4 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="text-base text-muted-foreground">{label}</span>
                <span className="text-base font-medium text-foreground">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div variants={fadeUp} className="flex justify-center gap-4">
        <Button variant="outline" size="lg">Edit Profile</Button>
        <Button variant="destructive" size="lg">Logout</Button>
      </motion.div>
    </motion.section>
  );
}
