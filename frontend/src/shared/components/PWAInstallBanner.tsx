import { useState, useEffect, type FC } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export const PWAInstallBanner: FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user already dismissed install banner in this session
    if (sessionStorage.getItem("vaniq_pwa_dismissed")) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("vaniq_pwa_dismissed", "1");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-[#161c0c] border border-[#c3f400]/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c3f400]/10 border border-[#c3f400]/30 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-[#c3f400]" />
          </div>
          <div>
            <h4 className="text-white text-xs font-bold tracking-wide uppercase font-['Syne']">
              Install VANIQ App
            </h4>
            <p className="text-neutral-400 text-[11px] leading-tight mt-0.5">
              Instant offline access for bazaar shopping
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-[#c3f400] text-[#111508] font-bold text-xs rounded-lg hover:bg-[#d4ff33] transition-colors shadow-sm"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
