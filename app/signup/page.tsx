"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Waves } from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import { isApiConfigured, loginUser, registerUser } from "../../lib/auth-client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
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

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setModeNotice("");
    setLoading(true);

    try {
      const result = await registerUser({ email, password, username });

      if (result.ok) {
        const existingToken =
          typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

        if (existingToken) {
          router.push("/portfolio");
          return;
        }

        const loginResult = await loginUser({ email, password });
        if (loginResult.ok) {
          if (loginResult.mode === "local") {
            setModeNotice("Account created and signed in via Local Mode.");
          }
          router.push("/portfolio");
          return;
        }

        setModeNotice("Account created. Please sign in to continue.");
        router.push("/login");
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
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <BrandLogo size={32} withWordmark showTagline={false} />
        </Link>

        <div className="auth-header">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Free forever. Set up in seconds.</p>
        </div>

        {!isApiConfigured() && (
          <div className="auth-notice auth-notice-info">
            <Waves size={13} />
            Local Mode is enabled — accounts are stored in your browser.
          </div>
        )}

        <form onSubmit={handleSignup} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              placeholder="Choose a username"
              required
              autoComplete="username"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Create a password"
              required
              autoComplete="new-password"
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
            {loading ? "Creating account\u2026" : "Create account"}
            {!loading && <ArrowRight size={15} />}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
