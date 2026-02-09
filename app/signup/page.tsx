"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BrainCircuit,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import { isApiConfigured, registerUser } from "../../lib/auth-client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modeNotice, setModeNotice] = useState("");
  const router = useRouter();

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setModeNotice("");
    setLoading(true);

    try {
      const result = await registerUser({ email, password, username });

      if (result.ok) {
        if (result.mode === "local") {
          setModeNotice("Account created and signed in via Local Mode.");
          router.push("/portfolio");
          return;
        }

        router.push(localStorage.getItem("access_token") ? "/portfolio" : "/login");
        return;
      }

      setError(result.detail || "Registration failed.");
    } catch {
      setError("Unable to create account right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pro-container py-8 sm:py-14">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5 items-stretch max-w-6xl mx-auto">
        <section className="surface-glass page-hero rounded-3xl p-6 sm:p-9 hidden lg:flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <BrandLogo size={52} withWordmark showTagline />
            <div className="inline-flex items-center gap-2 rounded-full border soft-divider px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] muted mt-6 bg-white/65 dark:bg-black/25">
              <Sparkles size={14} />
              Operator Onboarding
            </div>
            <h1 className="mt-4 text-3xl font-semibold section-title leading-tight max-w-xl">
              Build your decision stack and launch a serious trading workflow.
            </h1>
            <p className="mt-3 muted text-sm max-w-xl leading-relaxed">
              Create your account to unlock watchlists, analytics, research workspaces, and
              event-driven risk controls from day one.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-8 text-sm relative z-10 rise-stagger">
            <div className="card-elevated p-3 rounded-xl">
              <Rocket size={16} className="text-[var(--accent)]" />
              <p className="mt-2 text-xs muted">Fast setup</p>
            </div>
            <div className="card-elevated p-3 rounded-xl">
              <BrainCircuit size={16} className="text-[var(--accent-2)]" />
              <p className="mt-2 text-xs muted">AI-assisted workflows</p>
            </div>
            <div className="card-elevated p-3 rounded-xl">
              <Target size={16} className="text-[var(--accent-3)]" />
              <p className="mt-2 text-xs muted">Execution focus</p>
            </div>
          </div>
        </section>

        <section className="surface-glass rounded-3xl p-6 sm:p-9">
          <div className="lg:hidden mb-4">
            <BrandLogo size={42} withWordmark showTagline />
          </div>

          <h2 className="text-2xl font-semibold section-title">Create Account</h2>
          <p className="text-sm muted mt-1">Set up your stock intelligence profile and begin tracking.</p>

          {!isApiConfigured() && (
            <div className="mt-4 rounded-xl border border-cyan-300/50 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-800 dark:text-cyan-200 inline-flex items-center gap-1.5">
              <Waves size={13} />
              Backend API is not configured. New accounts are stored in Local Mode.
            </div>
          )}

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="muted">Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl control-surface bg-white/80 dark:bg-black/25 px-3 py-2.5 outline-none"
                placeholder="Choose a username"
                required
              />
            </label>

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
                placeholder="Create password"
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
              className="w-full rounded-xl bg-gradient-to-r from-[var(--accent-2)] via-teal-500 to-[var(--accent-3)] text-white font-semibold py-2.5 disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-5 text-sm muted flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={13} />
              Seamless onboarding
            </span>
            <span>
              Already registered?{" "}
              <Link href="/login" className="text-[var(--accent)] font-semibold hover:underline">
                Sign in
              </Link>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
