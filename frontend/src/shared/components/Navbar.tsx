/**
 * Navbar — Responsive navigation with auth buttons.
 *
 * Desktop (≥768px):
 *   - Sticky top glassmorphism bar
 *   - Left: Brand logo
 *   - Center: Nav links (Home, Items, Scan, History, Profile)
 *   - Right: Sign In + Register buttons, theme toggle
 *
 * Mobile (<768px):
 *   - Fixed bottom floating dock
 *   - Elevated center "Scan" FAB with pulse glow
 *
 * The auth buttons are placeholders — wire them to your
 * auth provider (e.g. /login, /register routes) when ready.
 */

import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import GradientText from "./GradientText";
import { Button } from "@/components/ui/button";

/* ── Navigation items ── */
const navItems = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/items", label: "Items", icon: ItemsIcon },
  { to: "/scan", label: "Scan", icon: ScanIcon },
  { to: "/transactions", label: "History", icon: HistoryIcon },
  { to: "/profile", label: "Profile", icon: ProfileIcon },
] as const;

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  /* Track scroll to intensify glass blur */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ───── DESKTOP NAV (top bar) ───── */}
      <nav
        className={`hidden md:block sticky top-0 z-50 glass-nav transition-all duration-300 ${
          scrolled ? "shadow-lg" : ""
        }`}
        style={{
          backdropFilter: scrolled ? "blur(32px)" : "blur(24px)",
          WebkitBackdropFilter: scrolled ? "blur(32px)" : "blur(24px)",
        }}
      >
        <div className="mx-auto flex items-center justify-between px-6 py-3">
          {/* ── Left: Brand ── */}
          <NavLink to="/" className="text-2xl font-extrabold tracking-tight shrink-0">
            <GradientText>Spendly</GradientText>
          </NavLink>

          {/* ── Center: Nav links ── */}
          <ul className="flex items-center gap-0.5">
            {navItems.map(({ to, label, icon: Icon }) => {
              const isScan = to === "/scan";
              const isActive = location.pathname === to;

              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/"}
                    className="relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200"
                    style={{
                      color: isScan && !isActive
                        ? "#fff"
                        : isActive
                        ? "var(--color-primary)"
                        : "var(--color-text-secondary)",
                      background: isScan && !isActive
                        ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
                        : undefined,
                    }}
                  >
                    {/* Animated active background pill */}
                    {isActive && !isScan && (
                      <motion.span
                        layoutId="desktop-nav-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "var(--color-primary-glow)" }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon size={16} />
                      <span>{label}</span>
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* ── Right: Auth buttons + theme toggle ── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Sign In */}
            <Button variant="ghost" size="lg">
              Sign In
            </Button>

            {/* Register */}
            <Button
              size="lg"
              className="shadow-md"
              style={{
                background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                color: "white",
                boxShadow: "0 4px 16px var(--color-primary-glow)",
              }}
            >
              Register
            </Button>

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "light" ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </Button>
          </div>
        </div>
      </nav>

      {/* ───── MOBILE NAV (bottom dock) ───── */}
      <nav className="md:hidden fixed bottom-4 left-3 right-3 z-50 glass-card rounded-2xl shadow-xl">
        <ul className="flex items-center justify-around py-2 px-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isScan = to === "/scan";
            const isActive = location.pathname === to;

            return (
              <li key={to} className={isScan ? "-mt-7" : ""}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  className="flex flex-col items-center gap-0.5"
                >
                  {isScan ? (
                    /* Elevated Scan FAB with pulse glow */
                    <motion.div
                      className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg animate-pulse-glow"
                      style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Icon size={24} />
                    </motion.div>
                  ) : (
                    <span
                      className="p-2 rounded-xl transition-colors"
                      style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-muted)" }}
                    >
                      <Icon size={22} />
                    </span>
                  )}
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color: isScan || isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                      marginTop: isScan ? "4px" : "0",
                    }}
                  >
                    {label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/* =====================================================
   SVG ICON COMPONENTS
   Clean, consistent stroke icons (24×24 viewBox).
   ===================================================== */

function HomeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  );
}

function ItemsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ScanIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2" />
      <path d="M17 3h2a2 2 0 012 2v2" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" />
      <path d="M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function HistoryIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ProfileIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MoonIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}

function SunIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
