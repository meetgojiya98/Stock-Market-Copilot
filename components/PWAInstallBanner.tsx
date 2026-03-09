"use client";

import { useEffect, useState } from "react";
import {
  canInstallPWA,
  promptPWAInstall,
  isPWAInstalled,
} from "@/lib/pwa-utils";

const DISMISS_KEY = "zentrade_pwa_dismissed_v1";

export default function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isPWAInstalled()) return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    // Check immediately and also poll briefly for the prompt event
    const check = () => {
      if (canInstallPWA()) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (check()) return;

    // The beforeinstallprompt event may fire after mount — listen for it
    const handler = () => {
      check();
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    const outcome = await promptPWAInstall();
    if (outcome === "accepted") {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(99, 102, 241, 0.25)",
        boxShadow: "0 0 24px rgba(99, 102, 241, 0.08)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: "var(--accent-2, #6366f1)",
          flexShrink: 0,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7-7 7 7" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--accent-2, #6366f1)",
          }}
        >
          Install Zentrade
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.5)",
            marginTop: "2px",
          }}
        >
          Add to home screen for a faster, native experience
        </div>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        style={{
          padding: "6px 16px",
          borderRadius: "8px",
          border: "none",
          background: "var(--accent-2, #6366f1)",
          color: "white",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Install
      </button>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "28px",
          height: "28px",
          borderRadius: "6px",
          border: "none",
          background: "rgba(255, 255, 255, 0.06)",
          color: "rgba(255, 255, 255, 0.4)",
          cursor: "pointer",
          fontSize: "16px",
          flexShrink: 0,
        }}
      >
        &times;
      </button>
    </div>
  );
}
