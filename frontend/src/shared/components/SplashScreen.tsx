/**
 * SplashScreen — Vaniq branded animated loading screen.
 *
 * Shows for ~2.4s on first load:
 * - "VANIQ" wordmark in Syne 800 electric lime
 * - Tagline "SECURE THE BAG." in Space Mono
 * - Electric lime progress bar
 * - Floating bazaar emojis
 * - Lime radial orbs in background
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onDone: () => void;
  /** Duration in ms before auto-dismissing — default 900 */
  duration?: number;
}

export default function SplashScreen({ onDone, duration = 900 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  const handleExit = () => {
    try {
      sessionStorage.setItem("vaniq_splash_seen", "true");
    } catch {}
    onDone();
  };

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={handleExit}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="splash-root cursor-pointer select-none"
          role="status"
          aria-label="Loading VANIQ"
          onClick={() => setVisible(false)}
        >
          {/* Lime glow orbs */}
          <div className="splash-orb splash-orb-1" />
          <div className="splash-orb splash-orb-2" />

          {/* Centre content */}
          <div className="splash-content">
            {/* Animated scan frame around wordmark */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative"
            >
              {/* Corner scan brackets */}
              <svg
                width="120" height="80"
                viewBox="0 0 120 80"
                className="absolute inset-0 w-full h-full pointer-events-none"
                fill="none"
              >
                {/* Top-left */}
                <motion.path d="M4 24V8a4 4 0 014-4h16" stroke="#c3f400" strokeWidth="2.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />
                {/* Top-right */}
                <motion.path d="M96 4h16a4 4 0 014 4v16" stroke="#c3f400" strokeWidth="2.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.3 }} />
                {/* Bottom-right */}
                <motion.path d="M116 56v16a4 4 0 01-4 4H96" stroke="#c3f400" strokeWidth="2.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }} />
                {/* Bottom-left */}
                <motion.path d="M24 76H8a4 4 0 01-4-4V56" stroke="#c3f400" strokeWidth="2.5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5 }} />
                {/* Scan line sweep */}
                <motion.line x1="14" y1="40" x2="106" y2="40" stroke="#c3f400" strokeWidth="1.5" strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [-20, 0, 20] }}
                  transition={{ delay: 0.6, duration: 1.5, repeat: Infinity, repeatDelay: 0.3 }} />
              </svg>

              {/* VANIQ wordmark */}
              <motion.h1
                className="splash-logo-text px-8 py-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
              >
                VANIQ
              </motion.h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="splash-tagline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              Secure the Bag.
            </motion.p>

            {/* Progress bar */}
            <motion.div
              className="splash-progress-track"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              <motion.div
                className="splash-progress-fill"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  delay: 0.6,
                  duration: (duration - 700) / 1000,
                  ease: "easeInOut",
                }}
                style={{ transformOrigin: "left" }}
              />
            </motion.div>

            {/* System status label */}
            <motion.p
              className="text-label-mono text-[10px] uppercase tracking-[0.3em]"
              style={{ color: "#8e9379" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              System Status: Optimal
            </motion.p>
          </div>

          {/* Floating bazaar emojis */}
          <FloatingIcons />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Floating decorative bazaar emoji elements */
function FloatingIcons() {
  const items = [
    { x: "8%",  y: "18%", delay: 0.4, icon: "🛒" },
    { x: "88%", y: "14%", delay: 0.7, icon: "🧾" },
    { x: "5%",  y: "72%", delay: 0.9, icon: "🏷️" },
    { x: "90%", y: "68%", delay: 0.6, icon: "🧅" },
    { x: "50%", y: "86%", delay: 1.0, icon: "🍅" },
    { x: "70%", y: "80%", delay: 0.5, icon: "💸" },
  ];

  return (
    <>
      {items.map((item, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl pointer-events-none select-none"
          style={{ left: item.x, top: item.y, filter: "blur(0.5px)" }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 0.4, 0.4, 0],
            scale: [0.5, 1, 1, 0.8],
            y: [0, -14, 0, -8, 0],
          }}
          transition={{
            delay: item.delay,
            duration: 5.5,
            repeat: Infinity,
          }}
        >
          {item.icon}
        </motion.span>
      ))}
    </>
  );
}
