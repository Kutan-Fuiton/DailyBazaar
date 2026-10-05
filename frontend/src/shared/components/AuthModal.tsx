/**
 * AuthModal — Vaniq styled Login / Register modal.
 * Shows automatically when no valid token exists.
 * Supports standard Username + Password AND Google OAuth SSO.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

type Tab = "login" | "register";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function AuthModal() {
  const { login, register, loginWithGoogle, loginDemo } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const reset = (t: Tab) => {
    setTab(t);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Google authentication failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: "1083984729104-samplegoogleclientid.apps.googleusercontent.com",
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              handleGoogleSuccess(response.credential);
            }
          },
        });
      } catch {
        // Ignored if Google client ID is not configured
      }
    }
  }, []);

  const handleGoogleClick = () => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      // Prompt user or simulate for dev testing if Google SDK is blocked
      const simulatedCredential = prompt("Enter your Google ID Token (or press OK for demo token):");
      if (simulatedCredential !== null) {
        handleGoogleSuccess(simulatedCredential || "mock_google_id_token_demo");
      }
    }
  };

  const handleDemo = async () => {
    setError("");
    setDemoLoading(true);
    try {
      await loginDemo();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Demo login failed. Please try again.");
      }
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        if (!email.trim()) { setError("Email is required"); setLoading(false); return; }
        await register(username, email, password);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "#111508" }}
    >
      {/* Lime radial shader */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(171,214,0,0.12) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />

      {/* Floating icons */}
      {["🛒","💸","🧾","🏷️"].map((icon, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl pointer-events-none select-none opacity-30"
          style={{
            left: ["8%","88%","5%","90%"][i],
            top:  ["15%","12%","72%","68%"][i],
          }}
          animate={{ y: [0, -12, 0], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.5 }}
        >
          {icon}
        </motion.span>
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-md"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(195,244,0,0.15)",
          borderRadius: "24px",
          padding: "2.5rem",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(195,244,0,0.08)",
        }}
      >
        {/* VANIQ logo */}
        <div className="text-center mb-6">
          <h1
            className="text-5xl font-black italic tracking-tight mb-2"
            style={{ fontFamily: "'Syne', sans-serif", color: "#c3f400" }}
          >
            VANIQ
          </h1>
          <p
            className="uppercase tracking-[0.2em] text-[11px]"
            style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
          >
            {tab === "login" ? "Welcome back, hustler" : "Join the bazaar"}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex rounded-full p-1 mb-5"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => reset(t)}
              className="flex-1 py-2 rounded-full text-sm font-bold uppercase transition-all duration-200"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: tab === t ? "#c3f400" : "transparent",
                color: tab === t ? "#283500" : "#8e9379",
                boxShadow: tab === t ? "2px 2px 0px #000" : "none",
              }}
            >
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* ── Demo Account CTA ── */}
        <motion.button
          type="button"
          id="demo-login-btn"
          onClick={handleDemo}
          disabled={demoLoading || loading || googleLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full mb-4 py-3.5 px-4 rounded-full font-black text-sm flex items-center justify-center gap-2.5 relative overflow-hidden"
          style={{
            fontFamily: "'Syne', sans-serif",
            background: demoLoading
              ? "rgba(195,244,0,0.15)"
              : "linear-gradient(135deg, rgba(195,244,0,0.18) 0%, rgba(195,244,0,0.08) 100%)",
            border: "1.5px solid rgba(195,244,0,0.55)",
            color: "#c3f400",
            boxShadow: demoLoading ? "none" : "0 0 18px rgba(195,244,0,0.18), inset 0 0 12px rgba(195,244,0,0.05)",
            cursor: demoLoading ? "wait" : "pointer",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {/* Animated glow pulse ring */}
          {!demoLoading && (
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: "1.5px solid rgba(195,244,0,0.4)" }}
              animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.07, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
          )}
          {demoLoading ? (
            <>
              <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Launching demo…
            </>
          ) : (
            <>
              <span className="text-base">🚀</span>
              Try Demo Account
            </>
          )}
        </motion.button>

        {/* Demo credentials hint */}
        <p
          className="text-center text-[10px] mb-4 -mt-2"
          style={{ fontFamily: "'Space Mono', monospace", color: "#5a6047" }}
        >
          No sign-up needed · Prefilled sandbox data
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/10" />
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
          >
            OR SIGN IN
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={googleLoading}
          className="w-full mb-5 py-3.5 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-3 transition-all"
          style={{
            background: "rgba(255, 255, 255, 0.07)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#ffffff",
            fontFamily: "'Hanken Grotesk', sans-serif",
            cursor: googleLoading ? "wait" : "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.borderColor = "rgba(195, 244, 0, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {googleLoading ? "Connecting to Google..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/10" />
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
          >
            OR WITH USERNAME
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
              htmlFor="auth-username"
            >
              Username or Email
            </label>
            <input
              id="auth-username"
              type="text"
              placeholder="e.g. subarno or test@gmail.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-xl px-4 py-3 text-sm transition-all"
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#e2e4cf",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#c3f400";
                e.target.style.boxShadow = "0 0 0 2px rgba(195,244,0,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.10)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Email — register only */}
          <AnimatePresence>
            {tab === "register" && (
              <motion.div
                key="email-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
                  htmlFor="auth-email"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={tab === "register"}
                  autoComplete="email"
                  className="w-full rounded-xl px-4 py-3 text-sm transition-all"
                  style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#e2e4cf",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#c3f400";
                    e.target.style.boxShadow = "0 0 0 2px rgba(195,244,0,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.10)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{ fontFamily: "'Space Mono', monospace", color: "#8e9379" }}
              htmlFor="auth-password"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl px-4 py-3 text-sm transition-all"
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#e2e4cf",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#c3f400";
                e.target.style.boxShadow = "0 0 0 2px rgba(195,244,0,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.10)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-center rounded-xl px-3 py-2"
                style={{
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  background: "rgba(255,180,171,0.10)",
                  color: "#ffb4ab",
                  border: "1px solid rgba(255,180,171,0.2)",
                }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            id="auth-submit"
            type="submit"
            disabled={loading || demoLoading}
            className="w-full mt-1 py-4 rounded-full font-black uppercase text-base transition-all brutal-btn"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: loading ? "#555" : "#c3f400",
              color: loading ? "#999" : "#283500",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" className="opacity-20" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                {tab === "login" ? "Signing in…" : "Creating account…"}
              </span>
            ) : (
              tab === "login" ? "Get Access" : "Join the Bazaar"
            )}
          </button>
        </form>

        <p
          className="text-center text-xs mt-5"
          style={{ fontFamily: "'Hanken Grotesk', sans-serif", color: "#8e9379" }}
        >
          {tab === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => reset(tab === "login" ? "register" : "login")}
            className="font-bold hover:underline underline-offset-2 transition-colors"
            style={{ color: "#c3f400" }}
          >
            {tab === "login" ? "Register" : "Sign in"}
          </button>
        </p>

        <p
          className="text-center text-[10px] mt-3 uppercase tracking-widest"
          style={{ fontFamily: "'Space Mono', monospace", color: "#444933" }}
        >
          No credit card required. Pure hustle.
        </p>
      </motion.div>
    </div>
  );
}
