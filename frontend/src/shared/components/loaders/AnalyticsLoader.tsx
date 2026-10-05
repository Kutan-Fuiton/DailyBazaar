/**
 * AnalyticsLoader — High-tech financial chart, equalizer frequency bars, and inflation metrics telemetry.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, BarChart3, Activity } from "lucide-react";

interface AnalyticsLoaderProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

const STATS_STEPS = [
  "Aggregating monthly spend buckets…",
  "Computing item inflation & bazaar rate deltas…",
  "Building category distribution curves…",
  "Finalizing market intelligence snapshot…",
];

export default function AnalyticsLoader({
  className = "",
  title = "Crunching Financial Analytics",
  subtitle,
}: AnalyticsLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STATS_STEPS.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 sm:p-8 max-w-sm w-full mx-auto ${className}`}>
      {/* Background radial glow */}
      <div
        className="absolute -inset-2 rounded-3xl opacity-25 blur-2xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,220,229,0.3) 0%, rgba(195,244,0,0.2) 50%, transparent 75%)",
        }}
      />

      {/* Floating Analytics Card Container */}
      <div
        className="relative w-64 h-56 rounded-2xl p-5 flex flex-col justify-between overflow-hidden"
        style={{
          backgroundColor: "rgba(20, 25, 14, 0.88)",
          backdropFilter: "blur(14px)",
          border: "1.5px solid rgba(0, 220, 229, 0.28)",
          boxShadow: "0 0 30px rgba(0, 220, 229, 0.1), inset 0 0 20px rgba(195, 244, 0, 0.04)",
        }}
      >
        {/* Top Header of Card */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              MARKET METRICS
            </span>
          </div>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
            <Activity className="w-2.5 h-2.5 animate-spin" /> LIVE
          </span>
        </div>

        {/* Dynamic Equalizer / Bar Chart Bars */}
        <div className="flex items-end justify-between gap-1.5 h-24 px-2 my-auto z-10">
          {[
            { duration: 1.1, minH: 20, maxH: 80, delay: 0.0 },
            { duration: 1.4, minH: 35, maxH: 95, delay: 0.2 },
            { duration: 0.9, minH: 15, maxH: 60, delay: 0.4 },
            { duration: 1.6, minH: 40, maxH: 100, delay: 0.1 },
            { duration: 1.2, minH: 25, maxH: 85, delay: 0.3 },
            { duration: 1.5, minH: 30, maxH: 75, delay: 0.5 },
            { duration: 1.0, minH: 18, maxH: 90, delay: 0.2 },
          ].map((bar, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                background: "linear-gradient(180deg, #00dce5 0%, #c3f400 65%, rgba(195,244,0,0.2) 100%)",
                boxShadow: "0 0 8px rgba(0, 220, 229, 0.4)",
              }}
              initial={{ height: `${bar.minH}%` }}
              animate={{
                height: [`${bar.minH}%`, `${bar.maxH}%`, `${bar.minH}%`],
              }}
              transition={{
                duration: bar.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: bar.delay,
              }}
            />
          ))}
        </div>

        {/* SVG Sparkline Curve Animation */}
        <div className="absolute inset-x-0 bottom-14 h-16 pointer-events-none opacity-30 z-0">
          <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            <motion.path
              d="M0,35 Q25,5 50,22 T100,8"
              fill="none"
              stroke="#00dce5"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>

        {/* Footer Indicators */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#8e9379] pt-2 border-t border-white/10 z-10">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#c3f400]" /> DELTA_COMPUTED
          </span>
          <span className="text-cyan-400 font-bold">SQL+REDIS</span>
        </div>
      </div>

      {/* Subtitles & Telemetry */}
      <div className="mt-5 text-center space-y-1.5">
        <h4 className="text-sm font-bold text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
          {title}
        </h4>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-mono text-cyan-300 font-medium"
          >
            {subtitle || STATS_STEPS[currentStep]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
