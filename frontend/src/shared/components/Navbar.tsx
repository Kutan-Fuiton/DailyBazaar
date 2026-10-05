/**
 * Navbar — Vaniq branded navigation.
 *
 * Desktop: Fixed top header — glass blur, VANIQ wordmark,
 *          3 nav links (Home, History, Items) + profile avatar.
 *
 * Mobile: Same fixed top header (compact) + bottom tab bar with
 *         4 tabs: Home | Shop | [+] | History  — plus profile avatar.
 *         The centre [+] opens an action sheet (Log / Scan / List).
 */

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

/* ── Primary tabs ── */
const MOBILE_TABS = [
  { path: "/home",         label: "Home",    icon: "home" },
  { path: "/shop",         label: "Shop",    icon: "shopping_cart" },
  { path: "/history",      label: "History", icon: "receipt_long" },
  { path: "/profile",      label: "Profile", icon: "person" },
];

/* ── Desktop nav links ── */
const DESKTOP_NAV = [
  { path: "/home",    label: "Home" },
  { path: "/stats",   label: "Stats" },
  { path: "/history", label: "History" },
  { path: "/items",   label: "Items" },
];

/* ── Action sheet options ── */
const ACTIONS = [
  { icon: "photo_camera",  label: "Scan Bill",       path: "/scan", color: "#00dce5" },
  { icon: "analytics",     label: "Stats & Trends",   path: "/stats", color: "#c3f400" },
  { icon: "checklist",     label: "Shopping List",   path: "/shop", color: "#ffb86f" },
];

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [actionOpen, setActionOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  /* Close sheet when clicking outside */
  useEffect(() => {
    if (!actionOpen) return;
    function handler(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setActionOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionOpen]);

  /* Close on route change */
  useEffect(() => { setActionOpen(false); }, [location.pathname]);

  return (
    <>
      {/* ── Top header ── */}
      <header className="fixed top-0 w-full z-50 glass-nav">
        <div className="h-14 max-w-[1200px] mx-auto px-5 flex items-center justify-between gap-4">

          {/* Logo */}
          <NavLink to="/home" className="flex items-center gap-2 flex-shrink-0">
            <span style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#c3f400",
              lineHeight: 1,
            }}>
              VANIQ
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 flex-1 justify-center" aria-label="Main navigation">
            {DESKTOP_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  fontWeight: isActive(item.path) ? 600 : 400,
                  letterSpacing: "0.01em",
                  color: isActive(item.path) ? "#c3f400" : "#8e9379",
                  transition: "color 0.2s ease",
                  textDecoration: "none",
                  position: "relative",
                  paddingBottom: "2px",
                }}
              >
                {item.label}
                {isActive(item.path) && (
                  <span style={{
                    position: "absolute",
                    bottom: "-2px",
                    left: 0,
                    right: 0,
                    height: "2px",
                    borderRadius: "999px",
                    background: "#c3f400",
                  }} />
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: desktop + button + profile */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Desktop + button */}
            <button
              onClick={() => setActionOpen((o) => !o)}
              className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full"
              style={{
                background: "#c3f400",
                color: "#1a2200",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.02em",
                border: "none",
                cursor: "pointer",
              }}
              aria-label="Quick actions"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px", lineHeight: 1 }}>add</span>
              Add
            </button>

            {/* Profile avatar */}
            <NavLink
              to="/profile"
              className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ border: "1.5px solid rgba(195,244,0,0.45)" }}
              aria-label="Profile"
            >
              {user?.username ? (
                <div className="w-full h-full flex items-center justify-center font-bold" style={{
                  background: "rgba(195,244,0,0.12)",
                  color: "#c3f400",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "12px",
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(195,244,0,0.08)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "#c3f400" }}>person</span>
                </div>
              )}
            </NavLink>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe-or-3 pt-1"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        aria-label="Mobile navigation"
      >
        <div
          className="flex items-center rounded-2xl py-1.5"
          style={{
            background: "rgba(13, 16, 5, 0.97)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 -2px 24px rgba(0,0,0,0.55)",
          }}
        >
          {/* Home tab */}
          {[MOBILE_TABS[0]].map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink key={item.path} to={item.path}
                className="flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl"
                style={{ color: active ? "#c3f400" : "#8e9379" }}
                aria-label={item.label}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: "22px", lineHeight: 1,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}>{item.icon}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: active ? 600 : 400, letterSpacing: "0.01em", lineHeight: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* Shop tab */}
          {[MOBILE_TABS[1]].map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink key={item.path} to={item.path}
                className="flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl"
                style={{ color: active ? "#c3f400" : "#8e9379" }}
                aria-label={item.label}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: "22px", lineHeight: 1,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}>{item.icon}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: active ? 600 : 400, letterSpacing: "0.01em", lineHeight: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* Centre + FAB */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setActionOpen((o) => !o)}
              aria-label="Quick actions"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background: actionOpen ? "#abd600" : "#c3f400",
                color: "#1a2200",
                border: "2px solid rgba(0,0,0,0.5)",
                boxShadow: "0 4px 16px rgba(195,244,0,0.30)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: actionOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px", lineHeight: 1 }}>add</span>
            </button>
          </div>

          {/* History tab */}
          {[MOBILE_TABS[2]].map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink key={item.path} to={item.path}
                className="flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl"
                style={{ color: active ? "#c3f400" : "#8e9379" }}
                aria-label={item.label}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: "22px", lineHeight: 1,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}>{item.icon}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: active ? 600 : 400, letterSpacing: "0.01em", lineHeight: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* Profile tab */}
          {[MOBILE_TABS[3]].map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink key={item.path} to={item.path}
                className="flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl"
                style={{ color: active ? "#c3f400" : "#8e9379" }}
                aria-label={item.label}
              >
                {user?.username ? (
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: active ? "rgba(195,244,0,0.2)" : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${active ? "#c3f400" : "rgba(255,255,255,0.15)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "10px",
                    color: active ? "#c3f400" : "#8e9379",
                  }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <span className="material-symbols-outlined" style={{
                    fontSize: "22px", lineHeight: 1,
                    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                  }}>{item.icon}</span>
                )}
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: active ? 600 : 400, letterSpacing: "0.01em", lineHeight: 1 }}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ── Action Sheet ── */}
      <AnimatePresence>
        {actionOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "fixed", inset: 0, zIndex: 48,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setActionOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              ref={sheetRef}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              style={{
                position: "fixed",
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 49,
                background: "#1e2113",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "20px",
                padding: "8px",
                minWidth: "260px",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}
            >
              {ACTIONS.map((action) => (
                <button
                  key={action.path}
                  onClick={() => { navigate(action.path); setActionOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                    background: `${action.color}14`,
                    border: `1px solid ${action.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px", color: action.color, lineHeight: 1 }}>
                      {action.icon}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#e2e4cf",
                    lineHeight: 1,
                  }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
