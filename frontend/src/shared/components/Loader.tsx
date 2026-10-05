/**
 * Loader — Context-aware loading system with dedicated task animations & layer overlay support.
 *
 * Variants:
 * - "ocr"        : Futuristic laser scan line, receipt wireframe & bounding boxes.
 * - "analytics"  : Dynamic financial chart equalizer, trend sparklines & metrics.
 * - "home"       : Shimmering glassmorphism card skeleton for dashboard and hauls.
 * - "sync"       : Real-time WebSocket household node orbits and signal pulses.
 * - "default"    : Clean SVG spinner with optional animated step telemetry.
 *
 * Layering:
 * - `overlay`    : Layers the loader over the parent container with frosted glass backdrop.
 * - `fullScreen` : Centers the loader over the entire viewport as a modal layer.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OCRScanLoader from "./loaders/OCRScanLoader";
import AnalyticsLoader from "./loaders/AnalyticsLoader";
import HomeLoader from "./loaders/HomeLoader";
import SyncLoader from "./loaders/SyncLoader";

export type LoaderVariant = "default" | "ocr" | "analytics" | "home" | "sync";

export interface LoaderProps {
  /** Visual variant tailored to specific loading task */
  variant?: LoaderVariant;
  /** Spinner size in px (for default variant) — defaults to 32 */
  size?: number;
  /** Optional multi-step labels for feedback */
  steps?: string[];
  /** Time per step in ms — defaults to 1600 */
  stepDuration?: number;
  /** Primary title text for the loader */
  title?: string;
  /** Secondary explanatory text */
  subtitle?: string;
  /** Render as a backdrop-blur overlay over parent container */
  overlay?: boolean;
  /** Render as a fixed full-screen viewport layer */
  fullScreen?: boolean;
  className?: string;
}

export default function Loader({
  variant = "default",
  size = 32,
  steps,
  stepDuration = 1600,
  title,
  subtitle,
  overlay = false,
  fullScreen = false,
  className = "",
}: LoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  /* Auto-advance through steps on a timer for default variant */
  useEffect(() => {
    if (!steps || steps.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [steps, stepDuration]);

  /* Render inner loader according to variant */
  const renderContent = () => {
    switch (variant) {
      case "ocr":
        return (
          <OCRScanLoader
            steps={steps}
            stepDuration={stepDuration}
            title={title}
            className={className}
          />
        );
      case "analytics":
        return (
          <AnalyticsLoader
            title={title}
            subtitle={subtitle}
            className={className}
          />
        );
      case "home":
        return (
          <HomeLoader
            title={title}
            subtitle={subtitle}
            className={className}
          />
        );
      case "sync":
        return (
          <SyncLoader
            title={title}
            subtitle={subtitle}
            className={className}
          />
        );
      case "default":
      default:
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
              className="animate-spin text-[#c3f400]"
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

            {/* Optional title */}
            {title && (
              <p className="text-sm font-semibold text-[#e2e4cf]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {title}
              </p>
            )}

            {/* Step label with fade transition */}
            {steps && steps.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs font-mono text-[#c3f400] font-medium"
                >
                  {steps[currentStep]}
                </motion.p>
              </AnimatePresence>
            )}

            {subtitle && (
              <p className="text-xs text-[#8e9379]">
                {subtitle}
              </p>
            )}

            <span className="sr-only">Loading…</span>
          </div>
        );
    }
  };

  /* Render as Layer Overlay if requested */
  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(17, 21, 8, 0.85)",
          backdropFilter: "blur(16px)",
        }}
      >
        {renderContent()}
      </motion.div>
    );
  }

  if (overlay) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-30 flex items-center justify-center p-4 rounded-3xl"
        style={{
          backgroundColor: "rgba(17, 21, 8, 0.78)",
          backdropFilter: "blur(12px)",
        }}
      >
        {renderContent()}
      </motion.div>
    );
  }

  return renderContent();
}
