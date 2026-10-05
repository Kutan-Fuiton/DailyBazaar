
export interface QuickChipItem {
  name: string;
  emoji: string;
  qty: number;
  unit: string;
  suggestedPrice?: number;
}

const DEFAULT_STAPLES: QuickChipItem[] = [
  { name: "Potato", emoji: "🥔", qty: 1, unit: "kg", suggestedPrice: 25 },
  { name: "Onion", emoji: "🧅", qty: 1, unit: "kg", suggestedPrice: 35 },
  { name: "Tomato", emoji: "🍅", qty: 0.5, unit: "kg", suggestedPrice: 20 },
  { name: "Milk", emoji: "🥛", qty: 1, unit: "L", suggestedPrice: 62 },
  { name: "Eggs", emoji: "🥚", qty: 1, unit: "dozen", suggestedPrice: 84 },
  { name: "Bread", emoji: "🍞", qty: 1, unit: "piece", suggestedPrice: 35 },
  { name: "Rice", emoji: "🍚", qty: 1, unit: "kg", suggestedPrice: 60 },
  { name: "Mustard Oil", emoji: "🫒", qty: 1, unit: "L", suggestedPrice: 155 },
  { name: "Green Chilli", emoji: "🌶️", qty: 100, unit: "g", suggestedPrice: 10 },
  { name: "Ginger", emoji: "🫚", qty: 200, unit: "g", suggestedPrice: 25 },
];

interface QuickAddChipsProps {
  onSelect: (item: QuickChipItem) => void;
  customStaples?: QuickChipItem[];
  label?: string;
}

export default function QuickAddChips({
  onSelect,
  customStaples,
  label = "Quick Add Staples",
}: QuickAddChipsProps) {
  const staples = customStaples && customStaples.length > 0 ? customStaples : DEFAULT_STAPLES;

  return (
    <div className="py-2">
      <p className="text-[10px] font-mono uppercase text-[#8e9379] tracking-wider mb-2 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs text-lime-400">bolt</span>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {staples.map((s, idx) => (
          <button
            key={`${s.name}-${idx}`}
            type="button"
            onClick={() => onSelect(s)}
            className="group px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-lime-400/10 border border-white/10 hover:border-lime-400/30 text-xs text-white/80 hover:text-lime-300 transition-all flex items-center gap-1.5 active:scale-95 select-none"
          >
            <span className="text-sm">{s.emoji}</span>
            <span className="font-medium text-xs">{s.name}</span>
            <span className="text-[10px] font-mono text-white/30 group-hover:text-lime-400/60">
              +{s.qty}
              {s.unit}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
