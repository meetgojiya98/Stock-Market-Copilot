"use client";

import Link from "next/link";
import { useState } from "react";
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
    <div className="pro-container py-8 sm:py-14">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5 items-stretch max-w-6xl mx-auto">
        <section className="surface-glass dynamic-surface page-hero rounded-3xl p-6 sm:p-9 hidden lg:flex flex-col justify-between relative overflow-hidden">
          <DynamicBackdrop variant="trading" />
          <div className="relative z-10">
            <BrandLogo size={52} withWordmark showTagline />
            <div className="inline-flex items-center gap-2 rounded-full border soft-divider px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] muted mt-6 bg-white/65 dark:bg-black/25">
              <Sparkles size={14} />
              Elite Command Surface
            </div>
            <h1 className="mt-4 text-3xl font-semibold section-title leading-tight max-w-xl">
              Operate your market stack with institutional-grade clarity.
            </h1>
            <p className="mt-3 muted text-sm max-w-xl leading-relaxed">
              Sign in to continue portfolio execution, event-risk monitoring, and AI-assisted
              research from a single decision-grade workspace.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-8 text-sm relative z-10 rise-stagger">
            <div className="card-elevated p-3 rounded-xl">
              <ShieldCheck size={16} className="text-[var(--accent-2)]" />
              <p className="mt-2 text-xs muted">Secure token auth</p>
            </div>
            <div className="card-elevated p-3 rounded-xl">
              <BarChart3 size={16} className="text-[var(--accent)]" />
              <p className="mt-2 text-xs muted">Realtime intelligence</p>
            </div>
            <div className="card-elevated p-3 rounded-xl">
              <TimerReset size={16} className="text-[var(--accent-3)]" />
              <p className="mt-2 text-xs muted">Fast state restore</p>
            </div>
          </div>
        </section>

        <section className="surface-glass dynamic-surface rounded-3xl p-6 sm:p-9 relative overflow-hidden">
          <DynamicBackdrop variant="mesh" />
          <div className="relative z-[1]">
          <div className="lg:hidden mb-4">
            <BrandLogo size={42} withWordmark showTagline />
          </div>

          <h2 className="text-2xl font-semibold section-title">Sign In</h2>
          <p className="text-sm muted mt-1">Access your personalized stock intelligence workspace.</p>

          {!isApiConfigured() && (
            <div className="mt-4 rounded-xl border border-cyan-300/50 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-800 dark:text-cyan-200 inline-flex items-center gap-1.5">
              <Waves size={13} />
              Backend API is not configured. Local Mode is enabled automatically.
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl control-surface bg-white/80 dark:bg-black/25 px-3 py-2.5 outline-none"
                placeholder="you@domain.com"
                required
              />
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="muted">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl control-surface bg-white/80 dark:bg-black/25 px-3 py-2.5 outline-none"
                placeholder="Enter password"
                required
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-300/60 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {modeNotice && (
              <div className="rounded-xl border border-emerald-300/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-200">
                {modeNotice}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--accent)] via-orange-500 to-[var(--accent-2)] text-white font-semibold py-2.5 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm muted gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <KeyRound size={14} />
              Session resumes instantly
            </span>
            <span>
              New here?{" "}
              <Link href="/signup" className="text-[var(--accent)] font-semibold hover:underline">
                Create your account
              </Link>
            </span>
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}
