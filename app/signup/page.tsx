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
import DynamicBackdrop from "../../components/DynamicBackdrop";
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
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-showcase auth-showcase-signup hidden lg:flex">
          <DynamicBackdrop variant="trading" className="opacity-[0.8]" />
          <div className="auth-showcase-content">
            <BrandLogo size={54} withWordmark showTagline />
            <p className="auth-eyebrow">
              <Sparkles size={14} />
              Operator Onboarding
            </p>
            <h1 className="auth-title">Create your Zentrade account and start trading with clarity.</h1>
            <p className="auth-subtitle">
              Launch your portfolio stack, research copilots, and execution workflows with one secure
              account.
            </p>

            <div className="auth-highlight-grid">
              <div className="auth-highlight-card">
                <Rocket size={16} />
                <span>Fast setup flow</span>
              </div>
              <div className="auth-highlight-card">
                <BrainCircuit size={16} />
                <span>AI-native tooling</span>
              </div>
              <div className="auth-highlight-card">
                <Target size={16} />
                <span>Execution-first UX</span>
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

            <p className="auth-form-eyebrow">Create Account</p>
            <h2 className="auth-form-title">Join Zentrade</h2>
            <p className="auth-form-subtitle">Set up your account and unlock the full trading stack.</p>

            {!isApiConfigured() && (
              <div className="auth-notice auth-notice-info">
                <Waves size={13} />
                Backend API is not configured. New accounts are stored in Local Mode.
              </div>
            )}

            <form onSubmit={handleSignup} className="auth-form-stack">
              <label className="auth-input-label">
                <span>Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="auth-input"
                  placeholder="Choose a username"
                  required
                />
              </label>

              <label className="auth-input-label">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-input"
                  placeholder="you@domain.com"
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
                  placeholder="Create password"
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
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="auth-footer-row">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={13} />
                Secure onboarding
              </span>
              <span>
                Already registered?{" "}
                <Link href="/login" className="auth-inline-link">
                  Sign in
                </Link>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
