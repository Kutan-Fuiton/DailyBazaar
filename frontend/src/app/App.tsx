/**
 * App.tsx — Root application shell.
 *
 * Structure:
 * - AuthProvider wraps everything for global auth state
 * - SplashScreen on first mount (2.4s animated intro)
 * - If not authenticated → shows AuthModal (full-screen login/register)
 * - If authenticated → shows Navbar + routes
 *
 * Note: Vaniq is permanently dark-mode. ThemeProvider removed.
 */

import { useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AlertModalProvider } from "../shared/components/AlertModal";
import { AuthProvider } from "../shared/context/AuthContext";
import { useAuth } from "../shared/context/AuthContext";
import { ErrorBoundary } from "../shared/components/ErrorBoundary";
import { PWAInstallBanner } from "../shared/components/PWAInstallBanner";
import { OfflineIndicator } from "../shared/components/OfflineIndicator";
import Navbar from "../shared/components/Navbar";
import SplashScreen from "../shared/components/SplashScreen";
import LandingPage from "../features/landing/LandingPage";
import AuthModal from "../shared/components/AuthModal";
import AppRoutes from "./routes";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AlertModalProvider>
        <TooltipProvider>
          <OfflineIndicator />
          <AppShell />
          <PWAInstallBanner />
        </TooltipProvider>
        </AlertModalProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

/* Separated so useLocation works inside BrowserRouter (in main.tsx) */
function AppShell() {
  const location = useLocation();
  const [splashDone, setSplashDone] = useState(() => {
    try {
      return sessionStorage.getItem("vaniq_splash_seen") === "true";
    } catch {
      return false;
    }
  });
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register">("login");

  // While checking stored token validity, show nothing (avoid flash)
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#111508]">
        <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#c3f400" strokeWidth="2">
          <circle cx="12" cy="12" r="10" className="opacity-20" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* ── Splash screen — shown on first load only ── */}
      {!splashDone && (
        <SplashScreen onDone={() => setSplashDone(true)} duration={800} />
      )}

      {/* ── Main App Shell ── */}
      {splashDone && (
        <>
          {/* If not logged in → show LandingPage + optional AuthModal */}
          {!isAuthenticated ? (
            <>
              <LandingPage
                onOpenAuth={(tab = "login") => {
                  setAuthInitialTab(tab);
                  setShowAuthModal(true);
                }}
              />
              <AnimatePresence>
                {showAuthModal && (
                  <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    initialTab={authInitialTab}
                  />
                )}
              </AnimatePresence>
            </>
          ) : (
            <>
              {/* Vaniq radial gradient background shader */}
              <div className="bg-shader" aria-hidden="true" />

              {/* Navigation */}
              <Navbar />

              {/* Main content */}
              <main className="relative z-10 flex-1 pb-28 md:pb-8">
                <AnimatePresence mode="wait">
                  <AppRoutes key={location.pathname} />
                </AnimatePresence>
              </main>
            </>
          )}
        </>
      )}
    </>
  );
}
