"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  LineChart,
  ListPlus,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  illustrationColor: string;
}

type AlertType = "price" | "volume" | "news" | "earnings";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "smc_onboarding_v2_done";

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Zentrade",
    description:
      "Your AI-powered stock market copilot. We will help you set up your workspace in just a few steps so you can start making smarter investment decisions.",
    icon: <Rocket size={40} />,
    illustrationColor: "#8b5cf6",
  },
  {
    id: "add-stock",
    title: "Add Your First Stock",
    description:
      "Search for a ticker symbol and add it to your portfolio. This will be the starting point for tracking your investments.",
    icon: <TrendingUp size={40} />,
    illustrationColor: "#10b981",
  },
  {
    id: "watchlist",
    title: "Set Up a Watchlist",
    description:
      "Create a watchlist to keep an eye on stocks you are interested in. You can track multiple symbols and get real-time updates.",
    icon: <Eye size={40} />,
    illustrationColor: "#3b82f6",
  },
  {
    id: "alerts",
    title: "Enable Alerts",
    description:
      "Configure price alerts, volume spikes, earnings notifications, and breaking news alerts so you never miss an important market event.",
    icon: <BellRing size={40} />,
    illustrationColor: "#f59e0b",
  },
  {
    id: "ready",
    title: "You're Ready!",
    description:
      "Your workspace is set up and ready to go. Explore the dashboard, run AI analysis, or check trending stocks to start your journey.",
    icon: <Sparkles size={40} />,
    illustrationColor: "#ec4899",
  },
];

const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "JPM", name: "JPMorgan" },
];

const WATCHLIST_SUGGESTIONS = [
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "DIA", name: "Dow Jones ETF" },
  { symbol: "ARKK", name: "ARK Innovation" },
  { symbol: "VTI", name: "Total Market ETF" },
  { symbol: "IWM", name: "Russell 2000 ETF" },
];

const ALERT_TYPES: { id: AlertType; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "price", label: "Price Alerts", desc: "Get notified when a stock hits your target price", icon: <TrendingUp size={18} /> },
  { id: "volume", label: "Volume Spikes", desc: "Detect unusual trading volume activity", icon: <LineChart size={18} /> },
  { id: "news", label: "Breaking News", desc: "Stay updated with market-moving headlines", icon: <Zap size={18} /> },
  { id: "earnings", label: "Earnings Reports", desc: "Never miss an earnings announcement", icon: <Bell size={18} /> },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OnboardingWizardV2() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  /* -- Step 2: stock input state -- */
  const [stockSearch, setStockSearch] = useState("");
  const [addedStock, setAddedStock] = useState<string | null>(null);

  /* -- Step 3: watchlist state -- */
  const [watchlistItems, setWatchlistItems] = useState<string[]>([]);

  /* -- Step 4: alert state -- */
  const [enabledAlerts, setEnabledAlerts] = useState<Set<AlertType>>(new Set());

  /* ---------- Check localStorage on mount ---------- */

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (done !== "true") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  /* ---------- Close / Complete ---------- */

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const skipStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeOnboarding();
    }
  }, [currentStep, completeOnboarding]);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeOnboarding();
    }
  }, [currentStep, completeOnboarding]);

  const dismiss = useCallback(() => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
  }, [dontShowAgain]);

  /* ---------- Filtered symbols for step 2 ---------- */

  const filteredSymbols = useMemo(() => {
    const q = stockSearch.toLowerCase().trim();
    if (!q) return POPULAR_SYMBOLS;
    return POPULAR_SYMBOLS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [stockSearch]);

  /* ---------- Toggle watchlist item ---------- */

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlistItems((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  }, []);

  /* ---------- Toggle alert type ---------- */

  const toggleAlert = useCallback((alertId: AlertType) => {
    setEnabledAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
  }, []);

  /* ---------- Don't render if done ---------- */

  if (!visible) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div
      className="wizard-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "wizardFadeIn 0.2s ease",
        fontFamily: "inherit",
      }}
    >
      <div
        className="wizard-panel"
        style={{
          width: "min(520px, 92vw)",
          maxHeight: "88vh",
          background: "var(--surface-strong, #1e1e2e)",
          border: "1px solid var(--surface-border, #333)",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--ink, #e0e0e0)",
          animation: "wizardSlideUp 0.25s ease",
        }}
      >
        {/* header with progress and close */}
        <div
          className="wizard-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 0",
          }}
        >
          {/* step dots */}
          <div
            className="wizard-steps"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className="wizard-step-dot"
                style={{
                  width: i === currentStep ? 24 : 10,
                  height: 10,
                  borderRadius: 5,
                  background:
                    i < currentStep
                      ? "var(--accent, #8b5cf6)"
                      : i === currentStep
                      ? "var(--accent, #8b5cf6)"
                      : "rgba(255,255,255,0.12)",
                  transition: "all 0.3s ease",
                  cursor: i < currentStep ? "pointer" : "default",
                }}
                onClick={() => {
                  if (i < currentStep) setCurrentStep(i);
                }}
              />
            ))}
          </div>

          <button
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              opacity: 0.4,
              cursor: "pointer",
              padding: 4,
            }}
            aria-label="Close onboarding"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div
          className="wizard-body"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* illustration icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: `${step.illustrationColor}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: step.illustrationColor,
              marginBottom: 4,
            }}
          >
            {step.icon}
          </div>

          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              textAlign: "center",
            }}
          >
            {step.title}
          </h2>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              opacity: 0.65,
              textAlign: "center",
              margin: 0,
              maxWidth: 400,
            }}
          >
            {step.description}
          </p>

          {/* ---------- Step 2: Add Stock ---------- */}
          {currentStep === 1 && (
            <div style={{ width: "100%", maxWidth: 380 }}>
              <div
                className="wizard-highlight"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--surface-border, #444)",
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 12,
                }}
              >
                <Search size={16} style={{ opacity: 0.4 }} />
                <input
                  type="text"
                  placeholder="Search symbol (e.g. AAPL)"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "inherit",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 8,
                }}
              >
                {filteredSymbols.map((s) => {
                  const isAdded = addedStock === s.symbol;
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => setAddedStock(s.symbol)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: isAdded
                          ? `1px solid ${STEPS[1].illustrationColor}`
                          : "1px solid var(--surface-border, #444)",
                        background: isAdded
                          ? `${STEPS[1].illustrationColor}18`
                          : "rgba(255,255,255,0.02)",
                        color: "inherit",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                        transition: "all 0.15s",
                      }}
                    >
                      {isAdded ? (
                        <CheckCircle2 size={16} color={STEPS[1].illustrationColor} />
                      ) : (
                        <Plus size={16} style={{ opacity: 0.4 }} />
                      )}
                      <span style={{ fontWeight: 600 }}>{s.symbol}</span>
                      <span style={{ opacity: 0.5, fontSize: 12, marginLeft: "auto" }}>
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {addedStock && (
                <div
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    fontSize: 13,
                    color: STEPS[1].illustrationColor,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Check size={14} />
                  {addedStock} added to your portfolio
                </div>
              )}
            </div>
          )}

          {/* ---------- Step 3: Watchlist ---------- */}
          {currentStep === 2 && (
            <div style={{ width: "100%", maxWidth: 380 }}>
              <p
                style={{
                  fontSize: 12,
                  opacity: 0.45,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                Select ETFs and indices to watch
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {WATCHLIST_SUGGESTIONS.map((s) => {
                  const inList = watchlistItems.includes(s.symbol);
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => toggleWatchlist(s.symbol)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: inList
                          ? `1px solid ${STEPS[2].illustrationColor}`
                          : "1px solid var(--surface-border, #444)",
                        background: inList
                          ? `${STEPS[2].illustrationColor}15`
                          : "rgba(255,255,255,0.02)",
                        color: "inherit",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                        transition: "all 0.15s",
                      }}
                    >
                      {inList ? (
                        <Star size={16} fill={STEPS[2].illustrationColor} color={STEPS[2].illustrationColor} />
                      ) : (
                        <Star size={16} style={{ opacity: 0.3 }} />
                      )}
                      <span style={{ fontWeight: 600, minWidth: 48 }}>{s.symbol}</span>
                      <span style={{ opacity: 0.5, fontSize: 12 }}>{s.name}</span>
                      {inList && (
                        <Check
                          size={14}
                          style={{ marginLeft: "auto", color: STEPS[2].illustrationColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {watchlistItems.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    fontSize: 13,
                    color: STEPS[2].illustrationColor,
                    fontWeight: 500,
                  }}
                >
                  {watchlistItems.length} item{watchlistItems.length > 1 ? "s" : ""} in your watchlist
                </div>
              )}
            </div>
          )}

          {/* ---------- Step 4: Alerts ---------- */}
          {currentStep === 3 && (
            <div style={{ width: "100%", maxWidth: 380 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ALERT_TYPES.map((at) => {
                  const enabled = enabledAlerts.has(at.id);
                  return (
                    <button
                      key={at.id}
                      onClick={() => toggleAlert(at.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: enabled
                          ? `1px solid ${STEPS[3].illustrationColor}`
                          : "1px solid var(--surface-border, #444)",
                        background: enabled
                          ? `${STEPS[3].illustrationColor}15`
                          : "rgba(255,255,255,0.02)",
                        color: "inherit",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: enabled
                            ? `${STEPS[3].illustrationColor}25`
                            : "rgba(255,255,255,0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: enabled ? STEPS[3].illustrationColor : "inherit",
                          flexShrink: 0,
                        }}
                      >
                        {at.icon}
                      </span>
                      <span style={{ flex: 1 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {at.label}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 12,
                            opacity: 0.5,
                            marginTop: 2,
                          }}
                        >
                          {at.desc}
                        </span>
                      </span>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: enabled
                            ? `2px solid ${STEPS[3].illustrationColor}`
                            : "2px solid rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: enabled ? STEPS[3].illustrationColor : "transparent",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        {enabled && <Check size={12} color="#fff" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              {enabledAlerts.size > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    fontSize: 13,
                    color: STEPS[3].illustrationColor,
                    fontWeight: 500,
                  }}
                >
                  {enabledAlerts.size} alert type{enabledAlerts.size > 1 ? "s" : ""} enabled
                </div>
              )}
            </div>
          )}

          {/* ---------- Step 5: Ready ---------- */}
          {currentStep === 4 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              {[
                { label: "Dashboard", icon: <ListPlus size={14} /> },
                { label: "AI Analysis", icon: <Sparkles size={14} /> },
                { label: "Trending", icon: <TrendingUp size={14} /> },
              ].map((item) => (
                <span
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {item.icon} {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div
          className="wizard-footer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderTop: "1px solid var(--surface-border, #333)",
          }}
        >
          {/* left: don't show again + skip */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                opacity: 0.5,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                style={{ accentColor: "var(--accent, #8b5cf6)" }}
              />
              Don&apos;t show again
            </label>
            {!isLast && (
              <button
                onClick={skipStep}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  opacity: 0.45,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                  padding: "4px 8px",
                }}
              >
                Skip
              </button>
            )}
          </div>

          {/* right: next / finish */}
          <button
            onClick={nextStep}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--accent, #8b5cf6)",
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
                Get Started <Rocket size={16} />
              </>
            ) : (
              <>
                Continue <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* animations */}
      <style>{`
        @keyframes wizardFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes wizardSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
