/**
 * OCRScanLoader — Futuristic scanning layer with laser sweep, bounding boxes, and step telemetry.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, Sparkles, Cpu } from "lucide-react";

interface OCRScanLoaderProps {
  steps?: string[];
  stepDuration?: number;
  className?: string;
  title?: string;
}

const DEFAULT_STEPS = [
  "Aligning image geometry & contrast…",
  "Segmenting receipt lines & vendor header…",
  "Extracting prices & weights with Vision AI…",
  "Cross-referencing regional bazaar lexicon…",
];

export default function OCRScanLoader({
  steps = DEFAULT_STEPS,
  stepDuration = 1400,
  className = "",
  title = "Analyzing Receipt Pixels",
}: OCRScanLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!steps || steps.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [steps, stepDuration]);

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 sm:p-8 max-w-sm w-full mx-auto ${className}`}>
      {/* Background ambient radial glow */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(195,244,0,0.35) 0%, rgba(0,220,229,0.15) 50%, transparent 75%)",
        }}
      />

      {/* Holographic Receipt Frame */}
      <div
        className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-2xl overflow-hidden p-5 flex flex-col justify-between"
        style={{
          backgroundColor: "rgba(22, 27, 13, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(195, 244, 0, 0.35)",
          boxShadow: "0 0 35px rgba(195, 244, 0, 0.12), inset 0 0 20px rgba(195, 244, 0, 0.04)",
        }}
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(195,244,0,0.5) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Laser Sweep Beam */}
        <motion.div
          className="absolute left-0 right-0 z-20 pointer-events-none"
          initial={{ top: "0%" }}
          animate={{ top: ["0%", "92%", "0%"] }}
          transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
        >
          {/* Laser line */}
          <div
            className="w-full h-1"
            style={{
              background: "linear-gradient(90deg, transparent 0%, #c3f400 20%, #ffffff 50%, #c3f400 80%, transparent 100%)",
              boxShadow: "0 0 12px #c3f400, 0 0 24px rgba(195,244,0,0.8)",
            }}
          />
          {/* Soft laser beam glow fan */}
          <div
            className="w-full h-12 -mt-6 opacity-30"
            style={{
              background: "linear-gradient(180deg, rgba(195,244,0,0.5) 0%, transparent 100%)",
            }}
          />
        </motion.div>

        {/* Header of simulated receipt */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scan className="w-4 h-4 text-[#c3f400] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#c3f400] font-bold">
                VISION OCR 2.0
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-[#c3f400]/15 text-[#c3f400] border border-[#c3f400]/30">
              <Cpu className="w-2.5 h-2.5 animate-spin" /> SCANNING
            </span>
          </div>
          <div className="h-2 w-28 bg-white/20 rounded-full animate-pulse" />
        </div>

        {/* Simulated OCR Bounding Boxes */}
        <div className="relative z-10 space-y-3.5 my-auto">
          {[
            { width: "85%", delay: 0.2 },
            { width: "70%", delay: 0.5 },
            { width: "92%", delay: 0.8 },
            { width: "60%", delay: 1.1 },
          ].map((box, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3, scale: 0.98 }}
              animate={{
                opacity: [0.3, 0.9, 0.4],
                borderColor: ["rgba(255,255,255,0.1)", "rgba(195,244,0,0.6)", "rgba(255,255,255,0.1)"],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: box.delay,
              }}
              className="p-1.5 rounded-md border border-white/10 bg-white/5 flex items-center justify-between"
            >
              <div
                className="h-2 bg-[#c3f400]/40 rounded"
                style={{ width: box.width }}
              />
              <div className="h-2 w-8 bg-cyan-400/40 rounded" />
            </motion.div>
          ))}
        </div>

        {/* Bottom receipt footer */}
        <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#8e9379]">
          <span>RAW_CAPTURE</span>
          <span className="text-[#c3f400] flex items-center gap-1 font-bold">
            <Sparkles className="w-3 h-3" /> MATCHING
          </span>
        </div>
      </div>

      {/* Progress Telemetry & Rotating Step Label */}
      <div className="mt-5 text-center space-y-1.5">
        <h4 className="text-sm font-bold text-[#e2e4cf] tracking-wide" style={{ fontFamily: "'Syne', sans-serif" }}>
          {title}
        </h4>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25 }}
            className="text-xs font-mono text-[#c3f400] font-medium"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
