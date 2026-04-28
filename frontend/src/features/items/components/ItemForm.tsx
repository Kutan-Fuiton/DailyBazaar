/**
 * ItemForm — Create or edit an item.
 *
 * Uses shadcn Input and Button components for polished form fields.
 */

import { useState } from "react";
import type { ItemFormValues } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ItemFormProps {
  onSubmit: (values: ItemFormValues) => void;
  initialValues?: Partial<ItemFormValues>;
}

const UNITS = ["kg", "g", "litre", "ml", "pcs", "dozen", "pack"];

export default function ItemForm({ onSubmit, initialValues }: ItemFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [price, setPrice] = useState(initialValues?.price ?? 0);
  const [unit, setUnit] = useState(initialValues?.unit ?? "kg");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    onSubmit({ name: name.trim(), category: category.trim(), price, unit });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Name</label>
        <Input
          placeholder="e.g. Basmati Rice"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Category</label>
        <Input
          placeholder="e.g. Grains"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Price (₹)</label>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Unit</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" size="lg">Save Item</Button>
      </div>
    </form>
  );
}
