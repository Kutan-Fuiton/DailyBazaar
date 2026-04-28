/**
 * SpotlightCard — Mouse-following spotlight effect on cards.
 *
 * Inspired by react-bits.dev SpotlightCard component.
 * Renders a card with a radial gradient spotlight that follows
 * the user's mouse cursor for an interactive glass effect.
 *
 * Usage:
 *   <SpotlightCard className="p-6">
 *     <h3>Title</h3>
 *   </SpotlightCard>
 */

import { useRef, useState, type ReactNode, type CSSProperties } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** Spotlight color — defaults to primary glow */
  spotlightColor?: string;
  style?: CSSProperties;
}

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "var(--color-primary-glow)",
  style,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`glass-card relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Spotlight gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 60%)`,
        }}
      />
      {/* Card content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
