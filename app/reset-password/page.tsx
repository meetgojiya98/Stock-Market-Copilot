"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
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

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters.");
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <BrandLogo size={32} withWordmark showTagline={false} />
        </Link>

        {success ? (
          <div className="auth-success">
            <div className="auth-success-icon">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="auth-title">Password updated</h2>
            <p className="auth-subtitle">
              Your password has been reset. You can now sign in with your new credentials.
            </p>
            <button onClick={() => router.push("/login")} className="auth-btn" style={{ marginTop: "1rem" }}>
              Go to Sign in
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <h1 className="auth-title">Reset password</h1>
              <p className="auth-subtitle">Enter your email and choose a new password.</p>
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
                <span className="auth-label">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="auth-input"
                  placeholder="Enter new password"
                  required
                  autoComplete="new-password"
                />
              </label>

              <label className="auth-field">
                <span className="auth-label">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                  placeholder="Confirm new password"
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
                {loading ? "Resetting\u2026" : "Reset password"}
                {!loading && <ArrowRight size={15} />}
              </button>
            </form>

            <p className="auth-footer">
              <Link href="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
