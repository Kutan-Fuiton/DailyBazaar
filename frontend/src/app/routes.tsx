/**
 * routes.tsx — Central route definitions.
 *
 * Navigation structure (per Vaniq_Usability_Improvement_Plan.md):
 *
 * Primary (bottom nav):
 *   /home    → Home dashboard
 *   /shop    → Shopping lists hub
 *   /history → Transaction history (alias for /transactions)
 *   /profile → Profile + secondary features
 *
 * Secondary (via + action sheet / profile):
 *   /scan    → OCR bill scanning
 *   /items   → Item catalogue
 *   /household → Household budgeting
 */

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { motion } from "framer-motion";

const HomePage    = lazy(() => import("../features/home/HomePage"));
const ShopPage    = lazy(() => import("../features/home/ShopPage"));
const ItemsPage   = lazy(() => import("../features/items/ItemsPage"));
const ProfilePage = lazy(() => import("../features/profile/ProfilePage"));
const ScanPage    = lazy(() => import("../features/scan/ScanPage"));
const ConfirmPage = lazy(() => import("../features/confirm/ConfirmPage"));
const StatsPage   = lazy(() => import("../features/stats/StatsPage"));

const pageTransitionVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit:    { opacity: 0, y: -10, filter: "blur(2px)" },
};

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-[#c3f400]/20 border-t-[#c3f400] animate-spin" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ROOT → Home (primary landing) */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Primary nav routes */}
        <Route path="/home"    element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/shop"    element={<PageTransition><ShopPage /></PageTransition>} />
        <Route path="/stats"   element={<PageTransition><StatsPage /></PageTransition>} />
        <Route path="/items"   element={<PageTransition><ItemsPage /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />

        {/* Secondary routes (via + sheet or profile) */}
        <Route path="/scan"    element={<PageTransition><ScanPage /></PageTransition>} />
        <Route path="/confirm" element={<PageTransition><ConfirmPage /></PageTransition>} />
        <Route path="/household" element={<Navigate to="/shop" replace />} />
        <Route path="/lists" element={<Navigate to="/shop" replace />} />
        <Route path="/planning" element={<Navigate to="/shop" replace />} />

        {/* Past Hauls History moved to Profile */}
        <Route path="/history" element={<Navigate to="/profile?tab=history" replace />} />
        <Route path="/transactions" element={<Navigate to="/profile?tab=history" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
