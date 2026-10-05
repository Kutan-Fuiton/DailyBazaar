/**
 * HomeLoader — Shimmering glassmorphism card skeleton with ambient aura for dashboard & home feeds.
 */
import { motion } from "framer-motion";
import { ShoppingBag, Zap, Layers } from "lucide-react";

interface HomeLoaderProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function HomeLoader({
  className = "",
  title = "Refreshing Bazaar Dashboard",
  subtitle = "Fetching live market benchmarks and trip hauls…",
}: HomeLoaderProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center p-6 sm:p-8 max-w-md w-full mx-auto ${className}`}>
      {/* Ambient background glow */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-25 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(195,244,0,0.3) 0%, rgba(26,31,15,0) 70%)",
        }}
      />

      {/* Shimmering Multi-Card Skeleton Mockup */}
      <div className="w-full space-y-3.5 relative z-10">
        {/* Top Hero Pill / Banner Skeleton */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 flex items-center justify-between"
          style={{
            backgroundColor: "rgba(26, 31, 15, 0.8)",
            border: "1px solid rgba(195, 244, 0, 0.2)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c3f400]/15 flex items-center justify-center text-[#c3f400] border border-[#c3f400]/25">
              <ShoppingBag className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 bg-white/20 rounded-md animate-pulse" />
              <div className="h-2.5 w-40 bg-white/10 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#c3f400]/10 border border-[#c3f400]/25 text-[10px] font-mono text-[#c3f400]">
            <Zap className="w-3 h-3 animate-spin" /> CACHED
          </div>

          {/* Shimmer sweep effect */}
          <motion.div
            className="absolute inset-0 -translate-x-full"
            animate={{ translateX: ["-100%", "200%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(195,244,0,0.12) 50%, transparent 100%)",
            }}
          />
        </div>

        {/* 2-Column Metric Tiles Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "MONTHLY SPEND", value: "₹—,—", color: "#c3f400" },
            { label: "RATE SAVINGS", value: "14.2%", color: "#00dce5" },
          ].map((card, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl p-3.5 flex flex-col justify-between h-24"
              style={{
                backgroundColor: "rgba(22, 27, 13, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#8e9379]">
                  {card.label}
                </span>
                <div
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: card.color }}
                />
              </div>
              <div className="h-6 w-24 bg-white/15 rounded-md animate-pulse" />

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 -translate-x-full"
                animate={{ translateX: ["-100%", "200%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Bottom Hauls List Skeleton */}
        <div
          className="relative overflow-hidden rounded-2xl p-3.5 space-y-2.5"
          style={{
            backgroundColor: "rgba(20, 25, 12, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8e9379]">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#c3f400]" /> RECENT TRIPS
            </span>
            <div className="h-2 w-12 bg-white/10 rounded" />
          </div>
          <div className="space-y-2">
            {[1, 2].map((n) => (
              <div key={n} className="flex items-center justify-between py-1 border-t border-white/5">
                <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-14 bg-[#c3f400]/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Telemetry */}
      <div className="mt-5 text-center space-y-1">
        <h4 className="text-sm font-bold text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
          {title}
        </h4>
        <p className="text-xs text-[#8e9379] font-medium">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
