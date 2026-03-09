"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import { resetPassword } from "../../lib/auth-client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword({ email, newPassword });
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.detail || "Password reset failed.");
      }
    } catch {
      setError("Unable to reach the authentication service.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Link href="/" className="auth-logo">
            <BrandLogo size={32} withWordmark showTagline={false} />
          </Link>
          <div className="flex flex-col items-center text-center py-4">
            <div className="p-3 rounded-full bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] mb-4">
              <CheckCircle2 size={28} className="text-[var(--positive)]" />
            </div>
            <h1 className="auth-title mb-2">Password Reset</h1>
            <p className="auth-subtitle mb-6">
              Your password has been updated successfully.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="auth-btn"
            >
              Back to Sign In
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <BrandLogo size={32} withWordmark showTagline={false} />
        </Link>

        <div className="auth-header">
          <div className="flex items-center justify-center mb-3">
            <div className="p-2.5 rounded-xl bg-[color-mix(in_srgb,var(--accent-2)_12%,transparent)]">
              <KeyRound size={22} className="text-[var(--accent-2)]" />
            </div>
          </div>
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email and a new password.</p>
        </div>

        <form onSubmit={handleReset} className="auth-form">
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
            <span className="auth-label">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="auth-input"
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              placeholder="Repeat your new password"
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

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Resetting\u2026" : "Reset Password"}
            {!loading && <ArrowRight size={15} />}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password?{" "}
          <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
