/**
 * Navbar — Vaniq branded navigation.
 *
 * Desktop: Fixed top header — glass blur, VANIQ wordmark,
 *          nav links with animated sliding-dash hover underline + profile avatar.
 *
 * Mobile: Same fixed top header + bottom tab bar with
 *         4 tabs: Home | Shop | [+] | History | Profile
 *         Centre [+] opens an action sheet (Scan / Stats / Shopping List).
 */

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

/* ── Primary mobile tabs ── */
const MOBILE_TABS = [
  { path: "/home",    label: "Home",    icon: "home" },
  { path: "/shop",    label: "Shop",    icon: "shopping_cart" },
  { path: "/stats",   label: "Stats",   icon: "analytics" },
  { path: "/profile", label: "Profile", icon: "person" },
];

/* ── Desktop nav links ── */
const DESKTOP_NAV = [
  { path: "/home",  label: "Home" },
  { path: "/scan",  label: "Scan" },
  { path: "/shop",  label: "Lists" },
  { path: "/stats", label: "Stats" },
  { path: "/items", label: "Items" },
];

/* ── Action sheet options ── */
const ACTIONS = [
  { icon: "photo_camera", label: "Scan Bill",      path: "/scan",    color: "#00dce5" },
  { icon: "analytics",    label: "Stats & Trends",  path: "/stats",   color: "#c3f400" },
  { icon: "checklist",    label: "Shopping List",   path: "/shop",    color: "#ffb86f" },
];

/* ─────────────────────────────────────────────────────────── */
/* Animated nav link — dash slides in from left on hover       */
/* ─────────────────────────────────────────────────────────── */
function DesktopNavLink({ path, label }: { path: string; label: string }) {
  const location = useLocation();
  const active   = location.pathname === path;
  const [hovered, setHovered] = useState(false);
  const showDash = hovered || active;

  return (
    <NavLink
      to={path}
      style={{ textDecoration: "none", position: "relative", paddingBottom: "14px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={active ? "page" : undefined}
    >
      {/* Label with spring micro-lift on hover */}
      <motion.span
        animate={{ y: hovered ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          fontWeight: active ? 600 : 500,
          letterSpacing: "0.01em",
          color: active ? "#c3f400" : hovered ? "#f0f4db" : "#8e9379",
          transition: "color 0.18s ease",
          display: "block",
          lineHeight: 1,
        }}
      >
        {label}
      </motion.span>

      {/* Animated cyber line-dash underline with neon bloom */}
      <AnimatePresence>
        {showDash && (
          <motion.span
            key="nav-dash"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              bottom: "8px",
              left: 0,
              width: "100%",
              height: "2.5px",
              borderRadius: "999px",
              background: active
                ? "#c3f400"
                : "repeating-linear-gradient(90deg, #c3f400, #c3f400 5px, transparent 5px, transparent 9px)",
              boxShadow: active
                ? "0 0 12px rgba(195, 244, 0, 0.65)"
                : "0 0 8px rgba(195, 244, 0, 0.45)",
              display: "block",
              transformOrigin: "left",
            }}
          />
        )}
      </AnimatePresence>
    </NavLink>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Main Navbar                                                  */
/* ─────────────────────────────────────────────────────────── */
export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [actionOpen, setActionOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  /* Close sheet & mobile menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionOpen && sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setActionOpen(false);
      }
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionOpen, mobileMenuOpen]);

  /* Close on route change */
  useEffect(() => {
    setActionOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* ── Top header ── */}
      <header className="fixed top-0 w-full z-50 glass-nav">
        <div
          style={{
            height: "56px",
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          {/* Logo */}
          <NavLink
            to="/home"
            style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: "8px" }}
            aria-label="Vaniq Home"
          >
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#c3f400",
                lineHeight: 1,
                display: "block",
                cursor: "pointer",
              }}
            >
              VANIQ
            </motion.span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                fontWeight: 700,
                color: "#c3f400",
                background: "rgba(195, 244, 0, 0.12)",
                border: "1px solid rgba(195, 244, 0, 0.35)",
                padding: "1px 6px",
                borderRadius: "4px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              v1.0
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "28px",
              flex: 1,
              justifyContent: "center",
            }}
            className="hidden md:flex"
            aria-label="Main navigation"
          >
            {DESKTOP_NAV.map((item) => (
              <DesktopNavLink key={item.path} path={item.path} label={item.label} />
            ))}
          </nav>

          {/* Right: Add button + avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {/* Desktop + button */}
            <motion.button
              onClick={() => setActionOpen((o) => !o)}
              whileHover={{ scale: 1.04, boxShadow: "0 4px 16px rgba(195,244,0,0.28)" }}
              whileTap={{ scale: 0.97 }}
              className="hidden md:flex"
              style={{
                alignItems: "center",
                gap: "5px",
                padding: "7px 14px",
                borderRadius: "999px",
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
              <span className="material-symbols-outlined" style={{ fontSize: "15px", lineHeight: 1 }}>add</span>
              Add
            </motion.button>

            {/* Profile avatar */}
            <NavLink
              to="/profile"
              aria-label="Profile"
              style={{ textDecoration: "none" }}
            >
              <motion.div
                whileHover={{ scale: 1.08, boxShadow: "0 0 0 3px rgba(195,244,0,0.3)" }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid rgba(195,244,0,0.4)",
                  background: "rgba(195,244,0,0.10)",
                  cursor: "pointer",
                  transition: "border-color 0.18s",
                }}
              >
                {user?.username ? (
                  <span
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#c3f400",
                    }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "15px", color: "#c3f400" }}
                  >
                    person
                  </span>
                )}
              </motion.div>
            </NavLink>

            {/* Mobile collapsible three-dash hamburger button */}
            <motion.button
              onClick={() => setMobileMenuOpen((o) => !o)}
              whileTap={{ scale: 0.92 }}
              className="md:hidden"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: mobileMenuOpen ? "rgba(195,244,0,0.14)" : "rgba(255,255,255,0.06)",
                border: mobileMenuOpen ? "1px solid rgba(195,244,0,0.4)" : "1px solid rgba(255,255,255,0.12)",
                color: mobileMenuOpen ? "#c3f400" : "#e2e4cf",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          </div>
        </div>

        {/* Collapsible Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden"
              style={{
                overflow: "hidden",
                background: "rgba(10, 15, 4, 0.98)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
              }}
            >
              <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* User status & tag badge */}
                {user && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "12px",
                      background: "rgba(195,244,0,0.06)",
                      border: "1px solid rgba(195,244,0,0.2)",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "rgba(195,244,0,0.2)",
                          color: "#c3f400",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#f0f4db" }}>
                        {user.username}
                      </span>
                    </div>
                    {user.tag && (
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#c3f400",
                          letterSpacing: "0.04em",
                        }}
                      >
                        #{user.tag}
                      </span>
                    )}
                  </div>
                )}

                {/* Navigation links */}
                {[
                  { path: "/home",    label: "Home Dashboard",              icon: "home" },
                  { path: "/shop",    label: "Shopping Lists & Collab",     icon: "shopping_cart" },
                  { path: "/stats",                label: "Stats & Price Intelligence",  icon: "analytics" },
                  { path: "/items",                label: "Item Catalogue",              icon: "inventory_2" },
                  { path: "/profile?tab=history",  label: "Past Hauls (History)",        icon: "receipt_long" },
                  { path: "/scan",                 label: "Scan Receipt (OCR)",          icon: "photo_camera" },
                  { path: "/profile", label: "Profile & Household Friends", icon: "person" },
                ].map((item) => {
                  const active = isActive(item.path);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        textDecoration: "none",
                        background: active ? "rgba(195,244,0,0.12)" : "rgba(255,255,255,0.02)",
                        border: active ? "1px solid rgba(195,244,0,0.3)" : "1px solid transparent",
                        color: active ? "#c3f400" : "#d2d7bc",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        fontWeight: active ? 600 : 500,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: "18px",
                            color: active ? "#c3f400" : "#8e9379",
                          }}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {active && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#c3f400",
                            boxShadow: "0 0 8px #c3f400",
                          }}
                        />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "0 12px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingTop: "6px",
        }}
        aria-label="Mobile navigation"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: "20px",
            padding: "4px 0",
            background: "rgba(13,16,5,0.97)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 -2px 24px rgba(0,0,0,0.55)",
          }}
        >
          {/* Tabs before centre FAB */}
          {MOBILE_TABS.slice(0, 2).map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "12px",
                  color: active ? "#c3f400" : "#8e9379",
                  textDecoration: "none",
                  transition: "color 0.18s",
                  position: "relative",
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.12, y: -2 }}
                  whileTap={{ scale: 0.90 }}
                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", width: "100%" }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "22px",
                      lineHeight: 1,
                      fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                      transition: "font-variation-settings 0.18s",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      fontWeight: active ? 600 : 400,
                      letterSpacing: "0.01em",
                      lineHeight: 1,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.div>
                {/* Active dot */}
                {active && (
                  <motion.span
                    layoutId="mobile-tab-dot"
                    style={{
                      position: "absolute",
                      bottom: "1px",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#c3f400",
                    }}
                  />
                )}
              </NavLink>
            );
          })}

          {/* Centre FAB */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.button
              onClick={() => setActionOpen((o) => !o)}
              animate={{ rotate: actionOpen ? 45 : 0 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              aria-label="Quick actions"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background: actionOpen ? "#abd600" : "#c3f400",
                color: "#1a2200",
                border: "2px solid rgba(0,0,0,0.45)",
                boxShadow: "0 4px 18px rgba(195,244,0,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px", lineHeight: 1 }}>add</span>
            </motion.button>
          </div>

          {/* Tabs after centre FAB */}
          {MOBILE_TABS.slice(2).map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "12px",
                  color: active ? "#c3f400" : "#8e9379",
                  textDecoration: "none",
                  transition: "color 0.18s",
                  position: "relative",
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.12, y: -2 }}
                  whileTap={{ scale: 0.90 }}
                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", width: "100%" }}
                >
                  {item.path === "/profile" && user?.username ? (
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: active ? "rgba(195,244,0,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1.5px solid ${active ? "#c3f400" : "rgba(255,255,255,0.14)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "10px",
                        color: active ? "#c3f400" : "#8e9379",
                        transition: "all 0.18s",
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "22px",
                        lineHeight: 1,
                        fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                        transition: "font-variation-settings 0.18s",
                      }}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      fontWeight: active ? 600 : 400,
                      letterSpacing: "0.01em",
                      lineHeight: 1,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.div>
                {active && (
                  <motion.span
                    layoutId="mobile-tab-dot"
                    style={{
                      position: "absolute",
                      bottom: "1px",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#c3f400",
                    }}
                  />
                )}
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
              onClick={() => setActionOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 48,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              ref={sheetRef}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{ opacity: 0,    y: 12, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 380 }}
              style={{
                position: "fixed",
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 82px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 49,
                background: "#1e2113",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "22px",
                padding: "8px",
                minWidth: "260px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              {ACTIONS.map((action, idx) => (
                <motion.button
                  key={action.path}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => { navigate(action.path); setActionOpen(false); }}
                  whileHover={{ background: "rgba(255,255,255,0.06)" }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "11px",
                      flexShrink: 0,
                      background: `${action.color}14`,
                      border: `1px solid ${action.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: action.color, lineHeight: 1 }}
                    >
                      {action.icon}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#e2e4cf",
                      lineHeight: 1,
                    }}
                  >
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
