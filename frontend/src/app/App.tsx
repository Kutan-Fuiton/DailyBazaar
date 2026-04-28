/**
 * App.tsx — Root application shell.
 *
 * Structure:
 * - ThemeProvider wraps everything for light/dark mode
 * - Decorative background orbs for visual depth
 * - Sticky Navbar (desktop top / mobile bottom)
 * - Animated route content centered on screen
 */

import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "../shared/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "../shared/components/Navbar";
import AppRoutes from "./routes";

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppShell />
      </TooltipProvider>
    </ThemeProvider>
  );
}

/* Separated so useLocation works inside BrowserRouter (in main.tsx) */
function AppShell() {
  const location = useLocation();

  return (
    <>
      {/* Decorative background orbs — floating gradient blobs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb-3" />
      </div>

      {/* Navigation */}
      <Navbar />

      {/* Main content — centered, with bottom padding for mobile nav */}
      <main className="relative z-10 flex-1 pb-28 md:pb-8">
        <AnimatePresence mode="wait">
          <AppRoutes key={location.pathname} />
        </AnimatePresence>
      </main>
    </>
  );
}
