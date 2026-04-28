/**
 * GradientText — Animated gradient text effect.
 *
 * Inspired by react-bits.dev GradientText component.
 * Renders text with a continuously animating gradient background.
 *
 * Usage:
 *   <GradientText>Spendly</GradientText>
 *   <GradientText colors={["#2DD4BF", "#818CF8", "#A78BFA"]}>Hello</GradientText>
 */

import { type ReactNode, type CSSProperties } from "react";
import "./GradientText.css";

interface GradientTextProps {
  children: ReactNode;
  /** Gradient color stops — defaults to primary→accent→secondary */
  colors?: string[];
  className?: string;
  style?: CSSProperties;
}

export default function GradientText({
  children,
  colors = ["var(--color-primary)", "var(--color-accent)", "var(--color-secondary)", "var(--color-primary)"],
  className = "",
  style,
}: GradientTextProps) {
  const gradient = `linear-gradient(90deg, ${colors.join(", ")})`;

  return (
    <span
      className={`gradient-text ${className}`}
      style={{
        backgroundImage: gradient,
        backgroundSize: "300% 100%",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
