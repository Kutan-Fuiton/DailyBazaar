/**
 * routes.tsx — Central route definitions.
 *
 * All feature pages are imported and mapped to URL paths.
 * Framer Motion page transitions are handled via AnimatePresence in App.tsx.
 * The /scan route is the highlighted primary action.
 */

import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "../features/home/HomePage";
import ScanPage from "../features/scan/ScanPage";
import ItemsPage from "../features/items/ItemsPage";
import TransactionsPage from "../features/transactions/TransactionsPage";
import ProfilePage from "../features/profile/ProfilePage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Home — greeting, spend summary, recent transactions */}
      <Route path="/" element={<HomePage />} />

      {/* Scan — OCR bill scanning & result editing */}
      <Route path="/scan" element={<ScanPage />} />

      {/* Items — user-customized item catalogue */}
      <Route path="/items" element={<ItemsPage />} />

      {/* Transactions — full bill history with search */}
      <Route path="/transactions" element={<TransactionsPage />} />

      {/* Profile — analytics & settings */}
      <Route path="/profile" element={<ProfilePage />} />

      {/* Catch-all → redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
