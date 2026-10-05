/**
 * SyncLoader — Real-time WebSocket synchronization animation with orbiting nodes and signal pulses.
 */
import { motion } from "framer-motion";
import { Users, Wifi, RefreshCw } from "lucide-react";

interface SyncLoaderProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function SyncLoader({
  className = "",
  title = "Household Live Sync",
  subtitle = "Streaming updates across connected family devices…",
}: SyncLoaderProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center p-6 sm:p-8 max-w-sm w-full mx-auto ${className}`}>
      {/* Background aura */}
      <div
        className="absolute -inset-2 rounded-3xl opacity-25 blur-2xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(195,244,0,0.3) 0%, rgba(138,43,226,0.2) 60%, transparent 75%)",
        }}
      />

      {/* Orbiting Sync Stage */}
      <div
        className="relative w-56 h-48 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: "rgba(24, 28, 16, 0.85)",
          border: "1.5px solid rgba(195, 244, 0, 0.25)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 25px rgba(195, 244, 0, 0.08)",
        }}
      >
        {/* Pulsing Signal Wave Rings */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-[#c3f400]/30"
            initial={{ width: 40, height: 40, opacity: 0.8 }}
            animate={{
              width: [40, 160],
              height: [40, 160],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: ring * 0.7,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Central Hub Node */}
        <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#c3f400]/15 border border-[#c3f400]/40 flex items-center justify-center shadow-lg">
          <Users className="w-6 h-6 text-[#c3f400]" />
          <motion.div
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-[#111508]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </div>

        {/* Orbiting Device 1 (Shopper at Market) */}
        <motion.div
          className="absolute z-20 w-8 h-8 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center"
          animate={{
            x: [60, -60, 60],
            y: [-35, 35, -35],
          }}
          transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut" }}
        >
          <Wifi className="w-4 h-4 text-cyan-300" />
        </motion.div>

        {/* Orbiting Device 2 (Family at Home) */}
        <motion.div
          className="absolute z-20 w-8 h-8 rounded-xl bg-[#c3f400]/10 border border-[#c3f400]/30 backdrop-blur-md flex items-center justify-center"
          animate={{
            x: [-60, 60, -60],
            y: [35, -35, 35],
          }}
          transition={{ duration: 4.0, repeat: Infinity, ease: "easeInOut" }}
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#c3f400] animate-spin" />
        </motion.div>

        {/* Top/Bottom Badges */}
        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between text-[9px] font-mono text-[#8e9379]">
          <span>WS_COLLAB</span>
          <span className="text-[#c3f400] font-bold">PUBSUB_READY</span>
        </div>
      </div>

      {/* Progress Telemetry */}
      <div className="mt-4 text-center space-y-1">
        <h4 className="text-sm font-bold text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
          {title}
        </h4>
        <p className="text-xs text-[#8e9379] font-medium font-mono">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
