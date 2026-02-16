"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ShieldCheck, Copy, Check, QrCode, KeyRound, ArrowRight, ArrowLeft, Trash2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "smc_2fa_v1";
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TwoFAState = {
  enabled: boolean;
  secret: string;
  backupCodes: string[];
  enabledAt: string;
};

type Step = "initial" | "qr" | "verify" | "backup" | "enabled";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateSecret(): string {
  const chars: string[] = [];
  for (let i = 0; i < 32; i++) {
    chars.push(BASE32_CHARS[Math.floor(Math.random() * BASE32_CHARS.length)]);
  }
  // Format as groups of 4
  return chars.join("").replace(/(.{4})/g, "$1 ").trim();
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const part1 = Math.floor(1000 + Math.random() * 9000).toString();
    const part2 = Math.floor(1000 + Math.random() * 9000).toString();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

function loadState(): TwoFAState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return null;
}

function saveState(state: TwoFAState | null) {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TwoFactorSetup() {
  const [step, setStep] = useState<Step>("initial");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [storedState, setStoredState] = useState<TwoFAState | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load persisted state
  useEffect(() => {
    const saved = loadState();
    if (saved?.enabled) {
      setStoredState(saved);
      setStep("enabled");
    }
  }, []);

  const handleStartSetup = () => {
    const newSecret = generateSecret();
    const newCodes = generateBackupCodes();
    setSecret(newSecret);
    setBackupCodes(newCodes);
    setDigits(["", "", "", "", "", ""]);
    setCodeError(false);
    setStep("qr");
  };

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;
      const updated = [...digits];
      updated[index] = value;
      setDigits(updated);
      setCodeError(false);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits]
  );

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const updated = [...digits];
      for (let i = 0; i < 6; i++) {
        updated[i] = pasted[i] || "";
      }
      setDigits(updated);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const handleVerify = () => {
    const code = digits.join("");
    if (code.length !== 6) {
      setCodeError(true);
      return;
    }
    // Mock validation: accept any 6-digit code
    setStep("backup");
  };

  const handleComplete = () => {
    const state: TwoFAState = {
      enabled: true,
      secret,
      backupCodes,
      enabledAt: new Date().toISOString(),
    };
    saveState(state);
    setStoredState(state);
    setStep("enabled");
  };

  const handleDisable = () => {
    saveState(null);
    setStoredState(null);
    setSecret("");
    setBackupCodes([]);
    setDigits(["", "", "", "", "", ""]);
    setStep("initial");
  };

  const copyToClipboard = (text: string, which: "secret" | "backup") => {
    navigator.clipboard.writeText(text).then(() => {
      if (which === "secret") {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedBackup(true);
        setTimeout(() => setCopiedBackup(false), 2000);
      }
    });
  };

  return (
    <div className="twofa-setup-card surface-glass">
      {/* ------ Initial State ------ */}
      {step === "initial" && (
        <div className="space-y-4">
          <div
            className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
          >
            <ShieldCheck size={28} style={{ color: "var(--accent)" }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Two-Factor Authentication
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Add an extra layer of security to your account. When enabled, you will need
            to enter a 6-digit code from your authenticator app each time you sign in,
            in addition to your password.
          </p>
          <ul
            className="text-[0.72rem] space-y-1 text-left"
            style={{ color: "var(--ink-muted)" }}
          >
            <li>Protects against password breaches</li>
            <li>Compatible with Google Authenticator, Authy, and others</li>
            <li>Backup codes provided for account recovery</li>
          </ul>
          <button
            onClick={handleStartSetup}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg text-white"
            style={{ background: "var(--accent)" }}
          >
            <ShieldCheck size={14} />
            Enable 2FA
          </button>
        </div>
      )}

      {/* ------ Step 1: QR Code ------ */}
      {step === "qr" && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              Step 1 of 3
            </span>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Scan QR Code
          </h3>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Scan this QR code with your authenticator app.
          </p>

          {/* QR Placeholder */}
          <div className="twofa-qr-placeholder">
            <div className="text-center">
              <QrCode size={64} style={{ color: "#333" }} />
              <div className="text-[0.6rem] text-gray-500 mt-1">QR Code</div>
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Or enter this key manually:
          </p>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{
              background: "color-mix(in srgb, var(--ink) 5%, transparent)",
              color: "var(--ink)",
            }}
          >
            <KeyRound size={12} style={{ color: "var(--accent)" }} />
            <span className="tracking-wider">{secret}</span>
            <button
              onClick={() => copyToClipboard(secret.replace(/\s/g, ""), "secret")}
              className="ml-1 p-0.5 rounded hover:opacity-70"
              title="Copy key"
            >
              {copiedSecret ? <Check size={12} style={{ color: "var(--positive)" }} /> : <Copy size={12} style={{ color: "var(--ink-muted)" }} />}
            </button>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setStep("initial")}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--ink)" }}
            >
              <ArrowLeft size={12} />
              Cancel
            </button>
            <button
              onClick={() => {
                setDigits(["", "", "", "", "", ""]);
                setCodeError(false);
                setStep("verify");
              }}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
              style={{ background: "var(--accent)" }}
            >
              Next
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ------ Step 2: Code Verification ------ */}
      {step === "verify" && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              Step 2 of 3
            </span>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Verify Code
          </h3>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Enter the 6-digit code from your authenticator app to verify setup.
          </p>

          <div className="twofa-code-input" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoFocus={i === 0}
                style={
                  codeError
                    ? { borderColor: "var(--negative)" }
                    : undefined
                }
              />
            ))}
          </div>

          {codeError && (
            <p className="text-[0.7rem]" style={{ color: "var(--negative)" }}>
              Please enter a complete 6-digit code.
            </p>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setStep("qr")}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--ink)" }}
            >
              <ArrowLeft size={12} />
              Back
            </button>
            <button
              onClick={handleVerify}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
              style={{ background: "var(--accent)" }}
            >
              Verify
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ------ Step 3: Backup Codes ------ */}
      {step === "backup" && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              Step 3 of 3
            </span>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Save Backup Codes
          </h3>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Save these codes in a secure location. Each code can only be used once to
            access your account if you lose your authenticator device.
          </p>

          <div className="twofa-backup-codes">
            {backupCodes.map((code, i) => (
              <div key={i} className="twofa-backup-code">
                {code}
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              copyToClipboard(backupCodes.join("\n"), "backup")
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {copiedBackup ? (
              <>
                <Check size={12} style={{ color: "var(--positive)" }} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy all codes
              </>
            )}
          </button>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleComplete}
              className="inline-flex items-center gap-1 text-xs font-medium px-4 py-2 rounded-lg text-white"
              style={{ background: "var(--positive)" }}
            >
              <ShieldCheck size={14} />
              Complete Setup
            </button>
          </div>
        </div>
      )}

      {/* ------ Enabled State ------ */}
      {step === "enabled" && (
        <div className="space-y-4">
          <div
            className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--positive) 12%, transparent)" }}
          >
            <ShieldCheck size={28} style={{ color: "var(--positive)" }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--positive)" }}>
            2FA Enabled
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Your account is protected with two-factor authentication.
            {storedState?.enabledAt && (
              <>
                {" "}Enabled on{" "}
                {new Date(storedState.enabledAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                .
              </>
            )}
          </p>

          <button
            onClick={handleDisable}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border"
            style={{
              borderColor: "color-mix(in srgb, var(--negative) 30%, var(--border))",
              color: "var(--negative)",
            }}
          >
            <Trash2 size={12} />
            Disable 2FA
          </button>
        </div>
      )}
    </div>
  );
}
