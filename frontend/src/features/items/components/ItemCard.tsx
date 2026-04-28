/**
 * ItemCard — Single item display with SpotlightCard and hover lift.
 *
 * Uses react-bits inspired SpotlightCard for interactive spotlight effect.
 */

import { motion } from "framer-motion";
import type { Item } from "../types";
import { formatCurrency } from "../../../shared/utils";
import SpotlightCard from "../../../shared/components/SpotlightCard";

interface ItemCardProps {
  item: Item;
  onDelete: (id: string) => void;
}

export default function ItemCard({ item, onDelete }: ItemCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <SpotlightCard className="p-6 flex flex-col gap-3 h-full">
        {/* Name & category */}
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>{item.name}</h3>
          <span
            className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: "var(--color-primary-glow)", color: "var(--color-primary)" }}
          >
            {item.category}
          </span>
        </div>

        {/* Price */}
        <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          {formatCurrency(item.price)}
          <span className="text-sm font-normal ml-1" style={{ color: "var(--color-text-muted)" }}>
            /{item.unit}
          </span>
        </p>

        {/* Delete */}
        <div className="flex justify-end mt-auto">
          <button
            onClick={() => onDelete(item.id)}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)" }}
          >
            Delete
          </button>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
