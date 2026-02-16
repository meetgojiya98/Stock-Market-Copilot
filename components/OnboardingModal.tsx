"use client";

import { useState, useEffect, useCallback } from "react";
import { BriefcaseBusiness, Bot, BellPlus, X } from "lucide-react";

const STEPS = [
  {
    icon: BriefcaseBusiness,
    title: "Build your portfolio",
    desc: "Add the stocks you own to track performance, allocation, and risk.",
  },
  {
    icon: Bot,
    title: "Ask AI anything",
    desc: "Use the Research page to get instant analysis on any stock.",
  },
  {
    icon: BellPlus,
    title: "Set up alerts",
    desc: "Create price rules so you never miss a move.",
  },
];

const STORAGE_KEY = "smc_onboarding_done";

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [stepTransition, setStepTransition] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    setStepTransition(true);
    const timer = setTimeout(() => setStepTransition(false), 10);
    return () => clearTimeout(timer);
  }, [step]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center fade-in" onClick={dismiss}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl surface-glass dynamic-surface overflow-hidden shadow-2xl fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg muted hover:opacity-70 transition-opacity"
          aria-label="Close onboarding"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className={`flex flex-col items-center text-center px-6 pt-10 pb-6 gap-4 transition-transform duration-200 ${stepTransition ? "scale-[0.97] opacity-90" : "scale-100 opacity-100"}`}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 24%, transparent)",
            }}
          >
            <Icon size={26} style={{ color: "var(--accent)" }} />
          </div>

          <div>
            <h2 className="text-lg font-bold section-title mb-1">{current.title}</h2>
            <p className="text-sm muted leading-relaxed">{current.desc}</p>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 pb-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="block rounded-full transition-all duration-300"
              style={{
                width: i === step ? "1.25rem" : "0.375rem",
                height: "0.375rem",
                background:
                  i === step
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--ink-muted) 40%, transparent)",
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: "var(--surface-border)" }}
        >
          <button
            onClick={dismiss}
            className="text-xs font-semibold muted hover:opacity-70 transition-opacity px-3 py-1.5"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="text-xs font-semibold px-5 py-2 rounded-lg transition-colors"
            style={{
              background: "var(--accent)",
              color: "white",
            }}
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
