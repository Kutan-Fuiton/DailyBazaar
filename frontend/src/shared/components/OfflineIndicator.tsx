import { useState, useEffect, type FC } from "react";
import { WifiOff, Wifi } from "lucide-react";

export const OfflineIndicator: FC = () => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <aside
      aria-label="Network status"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top duration-300 pointer-events-none"
    >
      {!isOnline ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e1505]/95 border border-amber-500/50 text-amber-300 text-xs font-medium shadow-2xl backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
          <span>Offline mode — drafts saved locally & will sync</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#111e05]/95 border border-[#c3f400]/50 text-[#c3f400] text-xs font-medium shadow-2xl backdrop-blur-md">
          <Wifi className="w-3.5 h-3.5 text-[#c3f400] flex-shrink-0" />
          <span>Back online — connection restored</span>
        </div>
      )}
    </aside>
  );
};
