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

const HomePage         = lazy(() => import("../features/home/HomePage"));
const ShopPage         = lazy(() => import("../features/home/ShopPage"));
const TransactionsPage = lazy(() => import("../features/transactions/TransactionsPage"));
const ItemsPage        = lazy(() => import("../features/items/ItemsPage"));
const ProfilePage      = lazy(() => import("../features/profile/ProfilePage"));
const HouseholdPage    = lazy(() => import("../features/household/HouseholdPage"));
const ScanPage         = lazy(() => import("../features/scan/ScanPage"));
const ConfirmPage      = lazy(() => import("../features/confirm/ConfirmPage"));
const StatsPage        = lazy(() => import("../features/stats/StatsPage"));

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
        <Route path="/home"    element={<HomePage />} />
        <Route path="/shop"    element={<ShopPage />} />
        <Route path="/history" element={<TransactionsPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Secondary routes (via + sheet or profile) */}
        <Route path="/scan"      element={<ScanPage />} />
        <Route path="/confirm"   element={<ConfirmPage />} />
        <Route path="/stats"     element={<StatsPage />} />
        <Route path="/items"     element={<ItemsPage />} />
        <Route path="/household" element={<HouseholdPage />} />

        {/* Legacy alias */}
        <Route path="/transactions" element={<Navigate to="/history" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
