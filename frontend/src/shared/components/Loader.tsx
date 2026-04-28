/**
 * Loader — Animated loading indicator.
 *
 * Two modes:
 * 1. Simple spinner (default): just pass size.
 * 2. Multi-step OCR loader: pass `steps` array for animated step labels
 *    e.g. ["Uploading…", "Scanning…", "Extracting items…"]
 *
 * The step loader auto-advances through labels on a timer
 * to give visual feedback during long OCR operations.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoaderProps {
  /** Spinner size in px — defaults to 32 */
  size?: number;
  /** Optional multi-step labels for OCR processing feedback */
  steps?: string[];
  /** Time per step in ms — defaults to 2000 */
  stepDuration?: number;
  className?: string;
}

export default function Loader({
  size = 32,
  steps,
  stepDuration = 2000,
  className = "",
}: LoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  /* Auto-advance through steps on a timer */
  useEffect(() => {
    if (!steps || steps.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [steps, stepDuration]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
    >
      {/* Spinning circle */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin text-primary"
      >
        <circle
          cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="3"
          strokeLinecap="round"
          className="opacity-20"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor" strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Step label with fade transition */}
      {steps && steps.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-medium text-text-secondary"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>
      )}

      <span className="sr-only">Loading…</span>
    </div>
  );
}
