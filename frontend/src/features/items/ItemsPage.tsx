/**
 * ItemsPage — User's custom item catalogue.
 *
 * Uses: shadcn Button, Card | react-bits SpotlightCard, GradientText
 */

import { useState } from "react";
import { motion } from "framer-motion";
import type { Item } from "./types";
import ItemCard from "./components/ItemCard";
import ItemForm from "./components/ItemForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GradientText from "../../shared/components/GradientText";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const SAMPLE_ITEMS: Item[] = [
  { id: "1", name: "Basmati Rice",  category: "Grains",     price: 120, unit: "kg",    createdAt: new Date().toISOString() },
  { id: "2", name: "Mustard Oil",   category: "Oils",       price: 180, unit: "litre", createdAt: new Date().toISOString() },
  { id: "3", name: "Onion",         category: "Vegetables", price: 40,  unit: "kg",    createdAt: new Date().toISOString() },
];

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>(SAMPLE_ITEMS);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = (values: { name: string; category: string; price: number; unit: string }) => {
    const newItem: Item = { ...values, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setItems((prev) => [newItem, ...prev]);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="page-container py-8 md:py-14"
    >
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">
          <GradientText>My Items</GradientText>
        </h1>
        <Button
          variant={showForm ? "outline" : "default"}
          size="lg"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ Add Item"}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8 overflow-hidden"
        >
          <Card className="backdrop-blur-lg border-border/50">
            <CardContent className="p-6">
              <ItemForm onSubmit={handleAdd} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Items grid */}
      {items.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>No items yet.</p>
          <p className="text-base mt-2" style={{ color: "var(--color-text-muted)" }}>Add your first item above!</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <motion.div key={item.id} variants={fadeUp}>
              <ItemCard item={item} onDelete={handleDelete} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}
