"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  KeyRound,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Waves,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import DynamicBackdrop from "../../components/DynamicBackdrop";
import { isApiConfigured, loginUser } from "../../lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modeNotice, setModeNotice] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("access_token")) {
      router.replace("/portfolio");
    }
  }, [router]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setModeNotice("");
    setLoading(true);

    try {
      const result = await loginUser({ email, password });

      if (result.ok) {
        if (result.mode === "local") {
          setModeNotice("Signed in via Local Mode (backend unavailable).");
        }
        router.push("/portfolio");
        return;
      }

      setError(result.detail || "Login failed.");
    } catch {
      setError("Unable to reach the authentication service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-showcase auth-showcase-login hidden lg:flex">
          <DynamicBackdrop variant="trading" className="opacity-[0.8]" />
          <div className="auth-showcase-content">
            <BrandLogo size={54} withWordmark showTagline />
            <p className="auth-eyebrow">
              <Sparkles size={14} />
              Welcome Back
            </p>
            <h1 className="auth-title">Pick up right where you left off.</h1>
            <p className="auth-subtitle">
              Your portfolio, research, watchlists, and alerts are all waiting for you.
              Sign in to get back to it.
            </p>

            <div className="auth-highlight-grid">
              <div className="auth-highlight-card">
                <ShieldCheck size={16} />
                <span>Secure login</span>
              </div>
              <div className="auth-highlight-card">
                <BarChart3 size={16} />
                <span>Live market data</span>
              </div>
              <div className="auth-highlight-card">
                <TimerReset size={16} />
                <span>Instant access</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-card surface-glass dynamic-surface">
          <DynamicBackdrop variant="mesh" className="opacity-[0.5]" />
          <div className="auth-form-content">
            <div className="lg:hidden mb-5">
              <BrandLogo size={44} withWordmark showTagline />
            </div>

            <p className="auth-form-eyebrow">Sign In</p>
            <h2 className="auth-form-title">Sign in to Zentrade</h2>
            <p className="auth-form-subtitle">Enter your details to access your account.</p>

            {!isApiConfigured() && (
              <div className="auth-notice auth-notice-info">
                <Waves size={13} />
                Backend API is not configured. Local Mode is enabled automatically.
              </div>
            )}

            <form onSubmit={handleLogin} className="auth-form-stack">
              <label className="auth-input-label">
                <span>Email or username</span>
                <input
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-input"
                  placeholder="you@domain.com or username"
                  required
                />
              </label>

              <label className="auth-input-label">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="auth-input"
                  placeholder="Enter password"
                  required
                />
              </label>

              {error && (
                <div className="auth-notice auth-notice-danger">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              {modeNotice && <div className="auth-notice auth-notice-success">{modeNotice}</div>}

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="auth-footer-row">
              <span className="inline-flex items-center gap-1">
                <KeyRound size={14} />
                You'll stay signed in
              </span>
              <span>
                New here?{" "}
                <Link href="/signup" className="auth-inline-link">
                  Create account
                </Link>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
