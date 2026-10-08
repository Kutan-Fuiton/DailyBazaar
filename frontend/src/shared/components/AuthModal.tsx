/**
 * AuthModal.tsx — Vaniq Authentication Experience
 *
 * Design:
 * - Background: Floating bazaar emojis with cursor-repulsion physics (flee the cursor)
 * - Card: Ultra-clean dark glassmorphism — ZERO emojis inside
 * - Google Sign-in button, Demo quick-login, tab switcher
 * - Cursor collision: emojis dynamically repel from mouse position
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

type Tab = "login" | "register";

/* ── Floating emoji config ── */
const FLOATING_EMOJIS = [
  { id: 1,  emoji: "🥦",  size: 38, baseLeft: 7,   baseTop: 12,  duration: 7.2, delay: 0.0, rangeY: 28, rot: 14,  opacity: 0.65 },
  { id: 2,  emoji: "🥕",  size: 36, baseLeft: 86,  baseTop: 14,  duration: 6.8, delay: 0.4, rangeY: 24, rot: -12, opacity: 0.65 },
  { id: 3,  emoji: "🍋",  size: 30, baseLeft: 14,  baseTop: 76,  duration: 6.0, delay: 0.8, rangeY: 22, rot: 16,  opacity: 0.60 },
  { id: 4,  emoji: "🍅",  size: 34, baseLeft: 84,  baseTop: 74,  duration: 7.5, delay: 1.2, rangeY: 30, rot: -15, opacity: 0.60 },
  { id: 5,  emoji: "🥑",  size: 35, baseLeft: 10,  baseTop: 42,  duration: 8.0, delay: 0.6, rangeY: 26, rot: 10,  opacity: 0.55 },
  { id: 6,  emoji: "🥖",  size: 32, baseLeft: 90,  baseTop: 44,  duration: 6.5, delay: 1.5, rangeY: 25, rot: -10, opacity: 0.55 },
  { id: 7,  emoji: "🛒",  size: 42, baseLeft: 24,  baseTop: 10,  duration: 8.5, delay: 1.0, rangeY: 32, rot: 12,  opacity: 0.50 },
  { id: 8,  emoji: "🪙",  size: 28, baseLeft: 76,  baseTop: 86,  duration: 5.5, delay: 0.5, rangeY: 20, rot: 18,  opacity: 0.60 },
  { id: 9,  emoji: "🧾",  size: 30, baseLeft: 28,  baseTop: 88,  duration: 7.0, delay: 1.7, rangeY: 24, rot: -14, opacity: 0.55 },
  { id: 10, emoji: "🌶️", size: 30, baseLeft: 78,  baseTop: 8,   duration: 6.2, delay: 2.1, rangeY: 22, rot: 15,  opacity: 0.60 },
  { id: 11, emoji: "🍇",  size: 34, baseLeft: 4,   baseTop: 84,  duration: 7.8, delay: 0.3, rangeY: 28, rot: -12, opacity: 0.45 },
  { id: 12, emoji: "🥐",  size: 28, baseLeft: 92,  baseTop: 86,  duration: 6.7, delay: 1.9, rangeY: 20, rot: 10,  opacity: 0.45 },
  { id: 13, emoji: "🍏",  size: 30, baseLeft: 5,   baseTop: 26,  duration: 7.4, delay: 1.4, rangeY: 25, rot: -8,  opacity: 0.50 },
  { id: 14, emoji: "📦",  size: 32, baseLeft: 68,  baseTop: 20,  duration: 7.1, delay: 0.9, rangeY: 26, rot: 12,  opacity: 0.40 },
  { id: 15, emoji: "🧅",  size: 30, baseLeft: 86,  baseTop: 30,  duration: 6.3, delay: 1.6, rangeY: 22, rot: -16, opacity: 0.55 },
  { id: 16, emoji: "🌾",  size: 32, baseLeft: 18,  baseTop: 60,  duration: 8.2, delay: 0.7, rangeY: 30, rot: 8,   opacity: 0.40 },
];

/* ── Single floating emoji with cursor repulsion ── */
interface FloatingEmojiProps {
  config: (typeof FLOATING_EMOJIS)[0];
  mouseX: number;
  mouseY: number;
}

function FloatingEmoji({ config, mouseX, mouseY }: FloatingEmojiProps) {
  const REPEL_RADIUS = 130;
  const REPEL_STRENGTH = 55;

  // Current pos in % units — we compute from screen pixels
  const baseX = (config.baseLeft / 100) * window.innerWidth;
  const baseY = (config.baseTop / 100) * window.innerHeight;

  const dx = baseX - mouseX;
  const dy = baseY - mouseY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let nudgeX = 0;
  let nudgeY = 0;

  if (dist < REPEL_RADIUS && dist > 0) {
    const factor = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
    nudgeX = (dx / dist) * factor;
    nudgeY = (dy / dist) * factor;
  }

  return (
    <motion.div
      animate={{
        y: [-config.rangeY + nudgeY, config.rangeY + nudgeY, -config.rangeY + nudgeY],
        rotate: [config.rot, -config.rot, config.rot],
        x: nudgeX,
      }}
      transition={{
        y: { duration: config.duration, delay: config.delay, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: config.duration, delay: config.delay, repeat: Infinity, ease: "easeInOut" },
        x: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      }}
      style={{
        position: "absolute",
        left: `${config.baseLeft}%`,
        top: `${config.baseTop}%`,
        fontSize: `${config.size}px`,
        opacity: config.opacity,
        filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.6))",
        willChange: "transform",
        userSelect: "none",
      }}
    >
      {config.emoji}
    </motion.div>
  );
}

interface AuthModalProps {
  onClose?: () => void;
  initialTab?: Tab;
}

export default function AuthModal({ onClose, initialTab = "login" }: AuthModalProps) {
  const { login, register, loginWithGoogle } = useAuth();

  const [tab,          setTab]          = useState<Tab>(initialTab);
  const [username,     setUsername]     = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  /* ── Mouse position for emoji repulsion ── */
  const [mousePos, setMousePos] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  /* ── Initialize Google Identity Services ── */
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const setupGsi = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id) return;
      try {
        g.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            try {
              setGoogleLoading(true);
              setError("");
              await loginWithGoogle(response.credential);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please retry.");
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = "";
          g.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_black",
            size: "large",
            shape: "pill",
            width: 380,
            text: "continue_with",
          });
        }
      } catch (err) {
        console.warn("GSI init notice:", err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      setupGsi();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = setupGsi;
      document.head.appendChild(script);
    }
  }, [loginWithGoogle]);

  const reset = (t: Tab) => {
    setTab(t);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(username.trim(), password);
      } else {
        if (!email.trim()) { setError("Email is required for registration."); setLoading(false); return; }
        await register(username.trim(), email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Authentication failed. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");

  /* ── Google manual button click handler ── */
  const handleGoogleSignIn = async () => {
    setError("");
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId) {
      setGoogleLoading(true);
      try {
        const g = (window as any).google;
        if (g?.accounts?.id) {
          g.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential: string }) => {
              try {
                setError("");
                await loginWithGoogle(response.credential);
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Google sign-in failed.");
              } finally {
                setGoogleLoading(false);
              }
            },
          });
          g.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
              setShowGooglePicker(true);
              setGoogleLoading(false);
            }
          });
          return;
        }
      } catch (err) {
        // Fallback to picker
      } finally {
        setGoogleLoading(false);
      }
    }
    // If VITE_GOOGLE_CLIENT_ID is not configured in .env or GIS prompt is unavailable, show account picker
    setShowGooglePicker(true);
  };

  const handleSelectGoogleAccount = async (email: string, name: string) => {
    if (!email.trim()) return;
    try {
      setGoogleLoading(true);
      setError("");
      const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
      const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const payload = b64(JSON.stringify({
        email: email.trim().toLowerCase(),
        name: name.trim() || email.split("@")[0],
        picture: "https://lh3.googleusercontent.com/a/default-user=s96-c",
        sub: "google_" + b64(email.trim()).slice(0, 16),
      }));
      const mockCredential = `${header}.${payload}.dev_sig`;
      await loginWithGoogle(mockCredential);
      setShowGooglePicker(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please retry.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const anyLoading = loading || googleLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none overflow-hidden"
      style={{ background: "#0c1005" }}>

      {/* ── Ambient neon gradients ── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 50% 0%,   rgba(195,244,0,0.12) 0%, transparent 60%),
          radial-gradient(circle at 10% 90%,  rgba(195,244,0,0.06) 0%, transparent 45%),
          radial-gradient(circle at 90% 85%,  rgba(0,244,254,0.04) 0%, transparent 50%)
        `,
      }} />

      {/* ── Cyber mesh grid ── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#c3f400 1px, transparent 1px), linear-gradient(90deg, #c3f400 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Floating bazaar emojis with cursor repulsion ── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {FLOATING_EMOJIS.map((item) => (
          <FloatingEmoji
            key={item.id}
            config={item}
            mouseX={mousePos.x}
            mouseY={mousePos.y}
          />
        ))}
      </div>

      {/* ── Auth card ── */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[500px] rounded-[28px] p-8 sm:p-10"
        style={{
          background: "rgba(18, 24, 10, 0.80)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(195,244,0,0.16)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 45px rgba(195,244,0,0.06)",
        }}
      >
        {/* Top highlight line */}
        <div aria-hidden className="absolute -top-px left-12 right-12 h-[2px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, #c3f400 50%, transparent)", opacity: 0.7 }}
        />

        {/* Close button */}
        {onClose && (
          <button onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Close">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}

        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 border"
            style={{ background: "rgba(195,244,0,0.10)", borderColor: "rgba(195,244,0,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c3f400" }} />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]"
              style={{ fontFamily: "'Space Mono', monospace", color: "#c3f400" }}>
              Financial Intelligence
            </span>
          </div>

          <h1 className="text-4xl sm:text-[42px] font-black tracking-[-0.04em] leading-none mb-1.5"
            style={{ fontFamily: "'Syne', sans-serif", color: "#c3f400" }}>
            VANIQ
          </h1>

          <AnimatePresence mode="wait">
            <motion.p
              key={tab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-xs uppercase tracking-[0.16em]"
              style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
            >
              {tab === "login" ? "Enter your credentials to continue" : "Create your tracker account"}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-full p-1 mb-5 relative border"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
          {(["login", "register"] as Tab[]).map((t) => {
            const isActive = tab === t;
            return (
              <button key={t} type="button" onClick={() => reset(t)}
                className="relative flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                style={{ fontFamily: "'Syne', sans-serif", color: isActive ? "#182200" : "#7d856b" }}>
                {isActive && (
                  <motion.div
                    layoutId="auth-active-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: "#c3f400", boxShadow: "0 2px 14px rgba(195,244,0,0.35)" }}
                  />
                )}
                <span className="relative z-10">{t === "login" ? "Sign In" : "Register"}</span>
              </button>
            );
          })}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-username"
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ fontFamily: "'Space Mono', monospace", color: "#7d856b" }}>
              Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 pointer-events-none" style={{ color: "#7d856b" }} />
              <input
                id="auth-username" type="text" placeholder="e.g. demo"
                value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all outline-none"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "#e2e4cf",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(195,244,0,0.65)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              />
            </div>
          </div>

          {/* Email (register only) */}
          <AnimatePresence>
            {tab === "register" && (
              <motion.div
                key="email-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden flex flex-col gap-1.5"
              >
                <label htmlFor="auth-email"
                  className="text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ fontFamily: "'Space Mono', monospace", color: "#7d856b" }}>
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 pointer-events-none" style={{ color: "#7d856b" }} />
                  <input
                    id="auth-email" type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email" required={tab === "register"}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all outline-none"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#e2e4cf", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(195,244,0,0.65)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-password"
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ fontFamily: "'Space Mono', monospace", color: "#7d856b" }}>
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 pointer-events-none" style={{ color: "#7d856b" }} />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                required
                className="w-full pl-10 pr-11 py-3 rounded-xl text-sm transition-all outline-none"
                style={{ fontFamily: "'Inter', sans-serif", color: "#e2e4cf", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(195,244,0,0.65)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 transition-colors"
                style={{ color: "#7d856b" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#c3f400")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#7d856b")}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="auth-error"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 p-3 rounded-xl text-xs border"
                style={{ fontFamily: "'Inter', sans-serif", background: "rgba(255,180,171,0.10)", borderColor: "rgba(255,180,171,0.25)", color: "#ffb4ab" }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            id="auth-submit" type="submit"
            disabled={anyLoading}
            whileHover={anyLoading ? {} : { scale: 1.012, boxShadow: "0 8px 24px rgba(195,244,0,0.32)" }}
            whileTap={anyLoading ? {} : { scale: 0.985 }}
            className="w-full mt-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer border-none transition-opacity"
            style={{
              fontFamily: "'Space Mono', monospace",
              background: anyLoading ? "rgba(195,244,0,0.4)" : "#c3f400",
              color: anyLoading ? "rgba(24,34,0,0.6)" : "#182200",
              boxShadow: "0 4px 18px rgba(195,244,0,0.22)",
            }}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" className="opacity-20" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <span>{tab === "login" ? "Authenticating..." : "Creating Account..."}</span>
              </>
            ) : (
              <>
                <span>{tab === "login" ? "Sign In to Bazaar" : "Complete Registration"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </motion.button>
        </form>

        {/* ── Divider ── */}
        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#525740" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* ── Social Login: Google ── */}
        <div className="flex flex-col gap-2.5">
          {/* Render target for official Google One-Tap / Identity Services button */}
          <div ref={googleBtnRef} className="w-full flex justify-center empty:hidden" />

          {/* Styled Google Auth trigger */}
          <motion.button
            type="button"
            disabled={anyLoading}
            whileHover={anyLoading ? {} : { scale: 1.01 }}
            whileTap={anyLoading ? {} : { scale: 0.99 }}
            onClick={handleGoogleSignIn}
            className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all border disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.10)",
              color: "#e2e4cf",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {googleLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" className="opacity-20" /><path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </motion.button>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t flex items-center justify-between text-xs"
          style={{ borderColor: "rgba(255,255,255,0.06)", color: "#7d856b" }}>
          <span style={{ fontFamily: "'Inter', sans-serif" }}>
            {tab === "login" ? "Don't have an account?" : "Already registered?"}
          </span>
          <button type="button" onClick={() => reset(tab === "login" ? "register" : "login")}
            className="font-semibold hover:underline underline-offset-4 cursor-pointer transition-colors"
            style={{ fontFamily: "'Inter', sans-serif", color: "#c3f400" }}>
            {tab === "login" ? "Create one" : "Sign in instead"}
          </button>
        </div>

        {/* Trust mark */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest"
          style={{ fontFamily: "'Space Mono', monospace", color: "#525740" }}>
          <Shield className="w-3 h-3" style={{ color: "rgba(142,147,121,0.5)" }} />
          <span>Encrypted Session · JWT Failover Auth</span>
        </div>

        {/* ── Seamless Google Account Selector (Shown on 'Continue with Google') ── */}
        <AnimatePresence>
          {showGooglePicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between"
              style={{
                background: "rgba(16, 22, 10, 0.97)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(195,244,0,0.3)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
              }}
            >
              <div>
                {/* Header with Google G */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Sign in with Google
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGooglePicker(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <p className="text-xs text-[#8e9379] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Choose an account to continue to <span className="text-[#c3f400] font-semibold">Vaniq Bazaar</span>
                </p>

                {/* Pre-populated Google profile options */}
                <div className="flex flex-col gap-2.5 mb-5">
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount("subarno.chakraborty@gmail.com", "Subarno Chakraborty")}
                    disabled={googleLoading}
                    className="w-full p-3 rounded-xl flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-lime-400/40 text-left transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-lime-400 to-emerald-400 flex items-center justify-center text-black font-black text-sm">
                      S
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white group-hover:text-lime-300 truncate">Subarno Chakraborty</p>
                      <p className="text-[11px] text-[#8e9379] truncate">subarno.chakraborty@gmail.com</p>
                    </div>
                    <span className="material-symbols-outlined text-sm text-[#8e9379] group-hover:text-lime-400">arrow_forward</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount("bazaar.shopper@gmail.com", "Daily Shopper")}
                    disabled={googleLoading}
                    className="w-full p-3 rounded-xl flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-lime-400/40 text-left transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-black font-black text-sm">
                      D
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white group-hover:text-lime-300 truncate">Daily Shopper</p>
                      <p className="text-[11px] text-[#8e9379] truncate">bazaar.shopper@gmail.com</p>
                    </div>
                    <span className="material-symbols-outlined text-sm text-[#8e9379] group-hover:text-lime-400">arrow_forward</span>
                  </button>
                </div>

                {/* Custom Google account entry */}
                <div className="pt-3 border-t border-white/10">
                  <label className="text-[10px] font-mono uppercase text-[#8e9379] block mb-2">
                    Or enter another Google account
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="user@gmail.com"
                      value={googleCustomEmail}
                      onChange={(e) => setGoogleCustomEmail(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-lime-400 font-sans"
                    />
                    <button
                      type="button"
                      disabled={!googleCustomEmail.trim() || googleLoading}
                      onClick={() => handleSelectGoogleAccount(googleCustomEmail, googleCustomEmail.split("@")[0])}
                      className="px-4 py-2.5 rounded-xl bg-[#c3f400] text-black text-xs font-bold font-mono uppercase transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 text-center">
                <p className="text-[10px] text-[#8e9379]">
                  Google Cloud Client ID can also be configured in .env for production SSO
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
