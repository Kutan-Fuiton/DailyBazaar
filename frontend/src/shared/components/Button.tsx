/**
 * Button — Reusable button with variant styles & micro-animations.
 *
 * All colors reference CSS custom properties from index.css
 * so the entire palette can be changed in one place.
 *
 * Variants: primary (gradient), secondary, outline, ghost, danger.
 *
 * API:
 *   <Button variant="primary" isLoading={saving} onClick={handleSave}>Save</Button>
 */

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}

/* ── Variant style map (using CSS variables) ── */
const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
    color: "#fff",
    boxShadow: "0 4px 16px var(--color-primary-glow)",
  },
  secondary: {
    background: "var(--color-secondary)",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(139, 92, 246, 0.2)",
  },
  outline: {
    background: "transparent",
    color: "var(--color-text-secondary)",
    border: "1px solid var(--color-border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-secondary)",
  },
  danger: {
    background: "var(--color-danger)",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(239, 68, 68, 0.2)",
  },
};

export default function Button({
  variant = "primary",
  isLoading = false,
  children,
  className = "",
  disabled,
  style,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {isLoading && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
