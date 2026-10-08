/**
 * AlertModal — Vaniq Custom Global Alert System
 *
 * Replaces browser's native window.alert() with a premium, animated modal
 * that matches the Vaniq design system (deep dark, electric lime, glassmorphism).
 *
 * Usage:
 *   - Drop <AlertModalProvider /> inside your app root (wrapping everything)
 *   - window.alert("Your message") now triggers this modal globally
 *   - Or call vaniqAlert("message") for programmatic control
 *
 * Architecture:
 *   - AlertModalProvider: mounts the portal + patches window.alert on mount
 *   - useAlertModal: inner hook to imperatively fire alerts
 *   - AlertModal: the actual rendered modal (framer-motion animated)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, AlertTriangle, Info, CheckCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AlertVariant = "default" | "success" | "warning" | "error" | "info";

interface AlertOptions {
  message: string;
  title?: string;
  variant?: AlertVariant;
  /** Label for the dismiss button. Defaults to "Got it" */
  confirmLabel?: string;
}

interface AlertModalContextValue {
  show: (opts: AlertOptions | string) => void;
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const AlertModalContext = createContext<AlertModalContextValue | null>(null);

export function useAlert(): AlertModalContextValue {
  const ctx = useContext(AlertModalContext);
  if (!ctx) throw new Error("useAlert must be used inside <AlertModalProvider />");
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// Variant config — icons, accent colours, glow colours
// ─────────────────────────────────────────────────────────────

interface VariantConfig {
  icon: ReactNode;
  accent: string;         // CSS hex
  glow: string;           // rgba for box-shadow glow
  badge: string;          // background for icon badge
  label: string;          // default title if none supplied
}

function getVariantConfig(variant: AlertVariant): VariantConfig {
  switch (variant) {
    case "success":
      return {
        icon: <CheckCircle size={22} strokeWidth={1.8} />,
        accent: "#c3f400",
        glow: "rgba(195, 244, 0, 0.18)",
        badge: "rgba(195, 244, 0, 0.12)",
        label: "Success",
      };
    case "warning":
      return {
        icon: <AlertTriangle size={22} strokeWidth={1.8} />,
        accent: "#ffb86f",
        glow: "rgba(255, 184, 111, 0.18)",
        badge: "rgba(255, 184, 111, 0.12)",
        label: "Heads Up",
      };
    case "error":
      return {
        icon: <AlertTriangle size={22} strokeWidth={1.8} />,
        accent: "#ff6b6b",
        glow: "rgba(255, 107, 107, 0.18)",
        badge: "rgba(255, 107, 107, 0.12)",
        label: "Error",
      };
    case "info":
      return {
        icon: <Info size={22} strokeWidth={1.8} />,
        accent: "#00dce5",
        glow: "rgba(0, 220, 229, 0.18)",
        badge: "rgba(0, 220, 229, 0.12)",
        label: "Notice",
      };
    default:
      return {
        icon: <Sparkles size={22} strokeWidth={1.8} />,
        accent: "#c3f400",
        glow: "rgba(195, 244, 0, 0.18)",
        badge: "rgba(195, 244, 0, 0.12)",
        label: "Vaniq",
      };
  }
}

// ─────────────────────────────────────────────────────────────
// Modal UI
// ─────────────────────────────────────────────────────────────

interface AlertModalUIProps {
  open: boolean;
  opts: AlertOptions | null;
  onClose: () => void;
}

function AlertModalUI({ open, opts, onClose }: AlertModalUIProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cfg = opts ? getVariantConfig(opts.variant ?? "default") : getVariantConfig("default");
  const title = opts?.title || cfg.label;
  const message = opts?.message ?? "";
  const confirmLabel = opts?.confirmLabel ?? "Got it";

  // Auto-focus confirm button when modal opens (accessibility + UX)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => buttonRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="vaniq-alert-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99998,
              backgroundColor: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
            aria-hidden="true"
          />

          {/* ── Modal panel ── */}
          <motion.div
            key="vaniq-alert-panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vaniq-alert-title"
            aria-describedby="vaniq-alert-desc"
            initial={{ opacity: 0, scale: 0.88, y: 28 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.92,    y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                pointerEvents: "all",
                background: "linear-gradient(145deg, #1a1e10 0%, #141808 60%, #111508 100%)",
                border: `1px solid ${cfg.accent}28`,
                borderRadius: "24px",
                boxShadow: `
                  0 0 0 1px ${cfg.accent}12,
                  0 8px 40px rgba(0,0,0,0.7),
                  0 0 60px ${cfg.glow},
                  inset 0 1px 0 rgba(255,255,255,0.04)
                `,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Ambient glow top strip */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "10%",
                  right: "10%",
                  height: "1px",
                  background: `linear-gradient(90deg, transparent, ${cfg.accent}60, transparent)`,
                  pointerEvents: "none",
                }}
              />

              {/* Noise texture overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
                  backgroundSize: "150px 150px",
                  pointerEvents: "none",
                  opacity: 0.5,
                }}
              />

              {/* Content */}
              <div style={{ padding: "28px 28px 24px", position: "relative" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
                  {/* Icon badge */}
                  <motion.div
                    initial={{ scale: 0.6, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.08 }}
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: cfg.badge,
                      border: `1px solid ${cfg.accent}25`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: cfg.accent,
                      flexShrink: 0,
                      boxShadow: `0 4px 16px ${cfg.glow}`,
                    }}
                  >
                    {cfg.icon}
                  </motion.div>

                  {/* Title & close */}
                  <div style={{ flex: 1, minWidth: 0, paddingTop: "4px" }}>
                    <p
                      style={{
                        fontSize: "10px",
                        fontFamily: "'Space Mono', monospace",
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        color: cfg.accent,
                        marginBottom: "4px",
                        opacity: 0.85,
                      }}
                    >
                      {cfg.label}
                    </p>
                    <h2
                      id="vaniq-alert-title"
                      style={{
                        fontSize: "18px",
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 800,
                        letterSpacing: "-0.01em",
                        color: "#e2e4cf",
                        lineHeight: 1.25,
                        textTransform: "uppercase",
                      }}
                    >
                      {title}
                    </h2>
                  </div>

                  {/* X button */}
                  <button
                    onClick={onClose}
                    aria-label="Dismiss"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#8e9379",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                      outline: "none",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget;
                      el.style.background = "rgba(255,255,255,0.09)";
                      el.style.color = "#e2e4cf";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget;
                      el.style.background = "rgba(255,255,255,0.04)";
                      el.style.color = "#8e9379";
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: "1px",
                    background: `linear-gradient(90deg, ${cfg.accent}22, rgba(255,255,255,0.06), transparent)`,
                    marginBottom: "20px",
                    marginLeft: "-4px",
                  }}
                />

                {/* Message body */}
                <motion.p
                  id="vaniq-alert-desc"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                  style={{
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                    color: "#c4c9ac",
                    lineHeight: 1.65,
                    letterSpacing: "-0.01em",
                    marginBottom: "24px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {message}
                </motion.p>

                {/* CTA Button */}
                <motion.button
                  ref={buttonRef}
                  onClick={onClose}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.28 }}
                  whileHover={{ scale: 1.02, boxShadow: `0 6px 24px ${cfg.glow}` }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: "14px",
                    border: "none",
                    background: cfg.accent,
                    color: "#111508",
                    fontSize: "12px",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: `0 4px 20px ${cfg.glow}`,
                    outline: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {confirmLabel}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// Provider — patches window.alert globally
// ─────────────────────────────────────────────────────────────

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<AlertOptions | null>(null);

  const show = useCallback((input: AlertOptions | string) => {
    const resolved: AlertOptions =
      typeof input === "string" ? { message: input } : input;
    setOpts(resolved);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Keep opts alive until exit animation finishes
    setTimeout(() => setOpts(null), 350);
  }, []);

  // ── Patch window.alert globally ──
  useEffect(() => {
    const original = window.alert.bind(window);
    window.alert = (msg?: unknown) => {
      const text = msg == null ? "" : String(msg);
      show({ message: text });
    };

    // Also expose vaniqAlert on window for direct typed usage
    (window as Window & { vaniqAlert?: typeof show }).vaniqAlert = show;

    return () => {
      window.alert = original;
      delete (window as Window & { vaniqAlert?: typeof show }).vaniqAlert;
    };
  }, [show]);

  return (
    <AlertModalContext.Provider value={{ show }}>
      {children}
      <AlertModalUI open={open} opts={opts} onClose={close} />
    </AlertModalContext.Provider>
  );
}
