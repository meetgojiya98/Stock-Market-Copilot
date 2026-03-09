"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  LayoutDashboard,
  Rocket,
  Search,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Welcome to Zentrade AI Agent OS",
    description:
      "Your intelligent trading command center powered by a fleet of AI agents. Let us walk you through the key features so you can hit the ground running.",
    icon: <Sparkles size={36} />,
  },
  {
    title: "Dashboard",
    description:
      "Your mission control for monitoring the entire agent fleet. View real-time portfolio performance, active agent statuses, market signals, and key metrics — all in one unified dashboard.",
    icon: <LayoutDashboard size={36} />,
  },
  {
    title: "AI Agents",
    description:
      "Six specialized agents work for you: Sentinel (risk), Analyst (fundamentals), Quant (technicals), Scanner (screener), Strategist (portfolio), and Oracle (macro forecasting). Deploy them individually or as a coordinated fleet.",
    icon: <Bot size={36} />,
  },
  {
    title: "Terminal",
    description:
      "A powerful command interface with slash commands and natural-language chat. Type /help to see all commands, ask questions in plain English, or run multi-step agent workflows — all from one prompt.",
    icon: <Terminal size={36} />,
  },
  {
    title: "Research",
    description:
      "AI-powered deep research that synthesizes SEC filings, earnings transcripts, analyst reports, and news into actionable insights. Get comprehensive company profiles in seconds, not hours.",
    icon: <Search size={36} />,
  },
  {
    title: "You're Ready!",
    description:
      "You are all set to start exploring. Open the terminal, deploy an agent, or dive into the dashboard — the entire platform is at your fingertips.",
    icon: <Rocket size={36} />,
  },
];

const STORAGE_KEY = "zentrade_onboarding_complete_v1";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  /* ---------- Show only for logged-in users who haven't completed ---------- */

  useEffect(() => {
    try {
      const loggedIn = !!localStorage.getItem("access_token");
      const done = localStorage.getItem(STORAGE_KEY);
      if (loggedIn && done !== "true") {
        setVisible(true);
      }
    } catch {
      /* SSR or storage blocked */
    }
  }, []);

  /* ---------- Actions ---------- */

  const complete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      complete();
    }
  }, [currentStep, complete]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  /* ---------- Bail if not visible ---------- */

  if (!visible) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "onbFadeIn 0.25s ease",
        fontFamily: "inherit",
      }}
    >
      <div
        key={currentStep}
        style={{
          width: "min(480px, 90vw)",
          background: "rgba(30, 30, 46, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          color: "var(--ink, #e0e0e0)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "onbSlideUp 0.3s ease",
        }}
      >
        {/* Close button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "12px 16px 0",
          }}
        >
          <button
            onClick={skip}
            aria-label="Close onboarding"
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              opacity: 0.35,
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "8px 32px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(59,130,246,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-2, #3b82f6)",
            }}
          >
            {step.icon}
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              margin: 0,
              textAlign: "center",
            }}
          >
            {step.title}
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              opacity: 0.6,
              textAlign: "center",
              margin: 0,
              maxWidth: 380,
            }}
          >
            {step.description}
          </p>

          {/* Step indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  background:
                    i <= currentStep
                      ? "var(--accent-2, #3b82f6)"
                      : "rgba(255,255,255,0.12)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
            <span
              style={{
                fontSize: 12,
                opacity: 0.4,
                marginLeft: 8,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {currentStep + 1}/{STEPS.length}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={skip}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              opacity: 0.4,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
              padding: "6px 10px",
            }}
          >
            Skip
          </button>

          <button
            onClick={next}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 22px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent-2, #3b82f6)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            {isLast ? (
              <>
                Start Trading <Rocket size={16} />
              </>
            ) : (
              <>
                Next <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes onbFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes onbSlideUp {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
