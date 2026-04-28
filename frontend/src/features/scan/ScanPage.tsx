/**
 * ScanPage — OCR bill scanning & result editing.
 *
 * Uses: shadcn Button, Card, Input | react-bits SpotlightCard, GradientText
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Loader from "../../shared/components/Loader";
import SpotlightCard from "../../shared/components/SpotlightCard";
import GradientText from "../../shared/components/GradientText";
import { formatCurrency } from "../../shared/utils";

interface ScannedItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

type ScanState = "idle" | "scanning" | "result";

const MOCK_RESULT: ScannedItem[] = [
  { id: "1", name: "Basmati Rice 1kg", qty: 2, price: 120 },
  { id: "2", name: "Mustard Oil 1L",   qty: 1, price: 180 },
  { id: "3", name: "Onion 1kg",        qty: 3, price: 40 },
  { id: "4", name: "Tomato 500g",      qty: 2, price: 30 },
  { id: "5", name: "Sugar 1kg",        qty: 1, price: 45 },
];

const SCAN_STEPS = ["Uploading…", "Scanning…", "Extracting items…"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ScanPage() {
  const [state, setState] = useState<ScanState>("idle");
  const [items, setItems] = useState<ScannedItem[]>([]);

  const handleScan = useCallback(() => {
    setState("scanning");
    setTimeout(() => {
      setItems(MOCK_RESULT.map((i) => ({ ...i })));
      setState("result");
    }, 5000);
  }, []);

  const updateItem = (id: string, field: keyof ScannedItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const handleReset = () => { setState("idle"); setItems([]); };

  const handleSave = () => {
    alert("Saved! (connect to backend)");
    handleReset();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="page-container py-8 md:py-14"
    >
      <h1 className="mb-8 text-3xl font-bold text-center">
        <GradientText>Scan Bill</GradientText>
      </h1>

      <AnimatePresence mode="wait">
        {/* ── IDLE: Upload ── */}
        {state === "idle" && (
          <motion.div key="upload" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3 }}>
            <SpotlightCard
              className="flex flex-col items-center justify-center gap-5 py-28 cursor-pointer"
              style={{ borderWidth: "2px", borderStyle: "dashed", borderColor: "var(--color-primary-glow)" }}
            >
              <div onClick={handleScan} className="flex flex-col items-center gap-5 w-full">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-2xl"
                  style={{ background: "var(--color-primary-glow)", color: "var(--color-primary)" }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-foreground">Upload your bill</p>
                <p className="text-base text-muted-foreground">Click here or drag & drop an image</p>
              </div>
            </SpotlightCard>
          </motion.div>
        )}

        {/* ── SCANNING ── */}
        {state === "scanning" && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="backdrop-blur-lg border-border/50">
              <CardContent className="flex items-center justify-center py-36">
                <Loader size={48} steps={SCAN_STEPS} stepDuration={1500} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {state === "result" && (
          <motion.div key="result" variants={container} initial="hidden" animate="show">
            <div className="flex flex-col gap-3 mb-6">
              {items.map((scanItem) => (
                <motion.div key={scanItem.id} variants={fadeUp}>
                  <Card className="backdrop-blur-lg border-border/50">
                    <CardContent className="flex items-center gap-3 px-5 py-4">
                      <Input
                        value={scanItem.name}
                        onChange={(e) => updateItem(scanItem.id, "name", e.target.value)}
                        className="flex-1 text-base font-medium border-none shadow-none"
                      />
                      <Input
                        type="number" min={1} value={scanItem.qty}
                        onChange={(e) => updateItem(scanItem.id, "qty", Number(e.target.value))}
                        className="w-16 text-center text-base border-none shadow-none"
                      />
                      <Input
                        type="number" min={0} step={0.01} value={scanItem.price}
                        onChange={(e) => updateItem(scanItem.id, "price", Number(e.target.value))}
                        className="w-24 text-right text-base font-semibold text-primary border-none shadow-none"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(scanItem.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Total */}
            <motion.div variants={fadeUp}>
              <Card className="backdrop-blur-lg border-2 border-primary/30 mb-8">
                <CardContent className="flex items-center justify-between px-6 py-5">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-extrabold text-primary">
                    {formatCurrency(total)}
                  </span>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} className="flex gap-4 justify-center">
              <Button variant="outline" size="lg" onClick={handleReset}>Scan Again</Button>
              <Button size="lg" onClick={handleSave}>Save Transaction</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
