"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import DynamicBackdrop from "../../components/DynamicBackdrop";
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
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-showcase auth-showcase-login hidden lg:flex">
          <DynamicBackdrop variant="trading" className="opacity-[0.8]" />
          <div className="auth-showcase-content">
            <Link href="/" className="inline-block">
              <BrandLogo size={54} withWordmark showTagline />
            </Link>
            <p className="auth-eyebrow">
              <ShieldCheck size={14} />
              Account Recovery
            </p>
            <h1 className="auth-title">Reset your password.</h1>
            <p className="auth-subtitle">
              Enter your email and choose a new password to regain access to your account.
            </p>
          </div>
        </section>

        <section className="auth-form-card surface-glass dynamic-surface">
          <DynamicBackdrop variant="mesh" className="opacity-[0.5]" />
          <div className="auth-form-content">
            <div className="lg:hidden mb-5">
              <Link href="/" className="inline-block">
                <BrandLogo size={44} withWordmark showTagline />
              </Link>
            </div>

            {success ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 grid place-items-center">
                  <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="auth-form-title">Password updated</h2>
                <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="auth-submit-btn mt-2"
                >
                  Go to Sign In
                </button>
              </div>
            ) : (
              <>
                <p className="auth-form-eyebrow">Reset Password</p>
                <h2 className="auth-form-title">Choose a new password</h2>
                <p className="auth-form-subtitle">
                  Enter the email associated with your account and your new password.
                </p>

                <form onSubmit={handleReset} className="auth-form-stack">
                  <label className="auth-input-label">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                      placeholder="you@domain.com"
                      required
                    />
                  </label>

                  <label className="auth-input-label">
                    <span>New password</span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="auth-input"
                      placeholder="Enter new password"
                      required
                    />
                  </label>

                  <label className="auth-input-label">
                    <span>Confirm new password</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input"
                      placeholder="Confirm new password"
                      required
                    />
                  </label>

                  {error && (
                    <div className="auth-notice auth-notice-danger">
                      <AlertTriangle size={14} />
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="auth-submit-btn">
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>

                <div className="auth-footer-row">
                  <Link href="/login" className="auth-inline-link inline-flex items-center gap-1">
                    <ArrowLeft size={14} />
                    Back to Sign In
                  </Link>
                  <span>
                    New here?{" "}
                    <Link href="/signup" className="auth-inline-link">
                      Create account
                    </Link>
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
