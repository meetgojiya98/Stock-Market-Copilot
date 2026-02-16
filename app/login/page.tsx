"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Waves } from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
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
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <BrandLogo size={32} withWordmark showTagline={false} />
        </Link>

        <div className="auth-header">
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">Welcome back. Enter your details to continue.</p>
        </div>

        {!isApiConfigured() && (
          <div className="auth-notice auth-notice-info">
            <Waves size={13} />
            Local Mode is enabled — no backend configured.
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Email or username</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
              required
              autoComplete="username"
            />
          </label>

          <label className="auth-field">
            <div className="auth-label-row">
              <span className="auth-label">Password</span>
              <Link href="/reset-password" className="auth-link-sm">Forgot?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="auth-notice auth-notice-danger">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {modeNotice && <div className="auth-notice auth-notice-success">{modeNotice}</div>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Signing in\u2026" : "Sign in"}
            {!loading && <ArrowRight size={15} />}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}
