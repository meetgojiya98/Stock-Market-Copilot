"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  Hash,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  Settings,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IntegrationId = "discord" | "slack" | "telegram" | "email";

type EventType = "price_alerts" | "trade_executed" | "earnings" | "portfolio_update";

interface WebhookConfig {
  id: IntegrationId;
  url: string;
  enabled: boolean;
  events: EventType[];
  lastTestedAt: number | null;
  testStatus: "idle" | "testing" | "success" | "error";
}

interface IntegrationMeta {
  id: IntegrationId;
  name: string;
  description: string;
  placeholder: string;
  icon: React.ReactNode;
  color: string;
}

interface EventTypeMeta {
  id: EventType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "smc_webhooks_v1";

const INTEGRATIONS: IntegrationMeta[] = [
  {
    id: "discord",
    name: "Discord",
    description: "Send notifications to a Discord channel via webhook URL.",
    placeholder: "https://discord.com/api/webhooks/...",
    icon: <Hash size={20} />,
    color: "#5865F2",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Post messages to a Slack channel using an incoming webhook.",
    placeholder: "https://hooks.slack.com/services/...",
    icon: <MessageSquare size={20} />,
    color: "#4A154B",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Send alerts to a Telegram chat via Bot API.",
    placeholder: "https://api.telegram.org/bot.../sendMessage?chat_id=...",
    icon: <Send size={20} />,
    color: "#0088CC",
  },
  {
    id: "email",
    name: "Email",
    description: "Receive notifications via email webhook endpoint.",
    placeholder: "https://api.yourservice.com/email-webhook",
    icon: <Mail size={20} />,
    color: "#EA4335",
  },
];

const EVENT_TYPES: EventTypeMeta[] = [
  {
    id: "price_alerts",
    label: "Price Alerts",
    description: "When a price target is hit",
    icon: <Bell size={14} />,
  },
  {
    id: "trade_executed",
    label: "Trade Executed",
    description: "When a trade order is filled",
    icon: <Zap size={14} />,
  },
  {
    id: "earnings",
    label: "Earnings",
    description: "Earnings reports and surprises",
    icon: <AlertCircle size={14} />,
  },
  {
    id: "portfolio_update",
    label: "Portfolio Update",
    description: "Daily portfolio summary",
    icon: <RefreshCw size={14} />,
  },
];

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

function defaultConfigs(): WebhookConfig[] {
  return INTEGRATIONS.map((i) => ({
    id: i.id,
    url: "",
    enabled: false,
    events: [],
    lastTestedAt: null,
    testStatus: "idle" as const,
  }));
}

function loadConfigs(): WebhookConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfigs();
    const parsed = JSON.parse(raw) as WebhookConfig[];
    if (Array.isArray(parsed) && parsed.length === INTEGRATIONS.length) {
      return parsed.map((c) => ({ ...c, testStatus: "idle" as const }));
    }
    return defaultConfigs();
  } catch {
    return defaultConfigs();
  }
}

function persistConfigs(configs: WebhookConfig[]): void {
  try {
    const toSave = configs.map(({ testStatus, ...rest }) => ({
      ...rest,
      testStatus: "idle",
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WebhookManager() {
  const [configs, setConfigs] = useState<WebhookConfig[]>(defaultConfigs);
  const [expandedCard, setExpandedCard] = useState<IntegrationId | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  /* ---------- Load on mount ---------- */

  useEffect(() => {
    setConfigs(loadConfigs());
  }, []);

  /* ---------- Update a single config ---------- */

  const updateConfig = useCallback(
    (id: IntegrationId, partial: Partial<WebhookConfig>) => {
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...partial } : c))
      );
    },
    []
  );

  /* ---------- Toggle enabled ---------- */

  const toggleEnabled = useCallback(
    (id: IntegrationId) => {
      setConfigs((prev) => {
        const next = prev.map((c) =>
          c.id === id ? { ...c, enabled: !c.enabled } : c
        );
        persistConfigs(next);
        return next;
      });
    },
    []
  );

  /* ---------- Toggle event type ---------- */

  const toggleEvent = useCallback(
    (id: IntegrationId, event: EventType) => {
      setConfigs((prev) => {
        const next = prev.map((c) => {
          if (c.id !== id) return c;
          const hasEvent = c.events.includes(event);
          return {
            ...c,
            events: hasEvent
              ? c.events.filter((e) => e !== event)
              : [...c.events, event],
          };
        });
        persistConfigs(next);
        return next;
      });
    },
    []
  );

  /* ---------- URL change ---------- */

  const setUrl = useCallback(
    (id: IntegrationId, url: string) => {
      updateConfig(id, { url });
    },
    [updateConfig]
  );

  /* ---------- Test webhook ---------- */

  const testWebhook = useCallback(
    (id: IntegrationId) => {
      updateConfig(id, { testStatus: "testing" });
      setTimeout(() => {
        const config = configs.find((c) => c.id === id);
        const success = config?.url.trim().startsWith("http");
        updateConfig(id, {
          testStatus: success ? "success" : "error",
          lastTestedAt: Date.now(),
        });
        setTimeout(() => {
          updateConfig(id, { testStatus: "idle" });
        }, 3000);
      }, 1200);
    },
    [configs, updateConfig]
  );

  /* ---------- Save all ---------- */

  const saveAll = useCallback(() => {
    persistConfigs(configs);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }, [configs]);

  /* ---------- Clear a webhook ---------- */

  const clearWebhook = useCallback(
    (id: IntegrationId) => {
      updateConfig(id, { url: "", enabled: false, events: [], lastTestedAt: null });
      setConfigs((prev) => {
        const next = prev.map((c) =>
          c.id === id
            ? { ...c, url: "", enabled: false, events: [], lastTestedAt: null }
            : c
        );
        persistConfigs(next);
        return next;
      });
    },
    [updateConfig]
  );

  /* ---------- Count connected ---------- */

  const connectedCount = configs.filter(
    (c) => c.enabled && c.url.trim().length > 0
  ).length;

  return (
    <div
      style={{
        background: "var(--surface-strong, #1e1e2e)",
        border: "1px solid var(--surface-border, #333)",
        borderRadius: 16,
        padding: 24,
        fontFamily: "inherit",
        color: "var(--ink, #e0e0e0)",
        maxWidth: 600,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <Webhook size={20} style={{ color: "var(--accent, #3b82f6)" }} />
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, flex: 1 }}>
          Webhook Integrations
        </h3>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 20,
            background:
              connectedCount > 0
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(255,255,255,0.06)",
            color: connectedCount > 0 ? "#10b981" : "inherit",
          }}
        >
          {connectedCount} connected
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          opacity: 0.45,
          marginTop: 4,
          marginBottom: 20,
        }}
      >
        Connect external services to receive real-time notifications from
        Zentrade.
      </p>

      {/* Integration cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {INTEGRATIONS.map((integration) => {
          const config = configs.find((c) => c.id === integration.id)!;
          const isExpanded = expandedCard === integration.id;
          const isConnected = config.enabled && config.url.trim().length > 0;

          return (
            <div
              key={integration.id}
              className="webhook-card"
              style={{
                borderRadius: 14,
                border: isConnected
                  ? `1px solid ${integration.color}44`
                  : "1px solid var(--surface-border, #333)",
                background: isConnected
                  ? `${integration.color}08`
                  : "rgba(255,255,255,0.02)",
                overflow: "hidden",
                transition: "all 0.2s",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setExpandedCard(isExpanded ? null : integration.id)
                }
              >
                {/* Icon */}
                <div
                  className="webhook-icon"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${integration.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: integration.color,
                    flexShrink: 0,
                  }}
                >
                  {integration.icon}
                </div>

                {/* Name + status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {integration.name}
                    </span>
                    {isConnected ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#10b981",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle2 size={12} /> Connected
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          opacity: 0.4,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Circle size={10} /> Not Connected
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>
                    {integration.description}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEnabled(integration.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: config.enabled ? "#10b981" : "inherit",
                    opacity: config.enabled ? 1 : 0.3,
                    padding: 4,
                    flexShrink: 0,
                  }}
                  title={config.enabled ? "Disable" : "Enable"}
                >
                  {config.enabled ? (
                    <ToggleRight size={26} />
                  ) : (
                    <ToggleLeft size={26} />
                  )}
                </button>

                {/* Expand chevron */}
                {isExpanded ? (
                  <ChevronUp size={16} style={{ opacity: 0.3 }} />
                ) : (
                  <ChevronDown size={16} style={{ opacity: 0.3 }} />
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    borderTop: "1px solid var(--surface-border, #333)",
                    paddingTop: 16,
                  }}
                >
                  {/* URL input */}
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: 0.5,
                      marginBottom: 6,
                    }}
                  >
                    Webhook URL
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <input
                      className="webhook-url-input"
                      type="text"
                      placeholder={integration.placeholder}
                      value={config.url}
                      onChange={(e) => setUrl(integration.id, e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--surface-border, #444)",
                        background: "rgba(255,255,255,0.03)",
                        color: "inherit",
                        fontSize: 13,
                        fontFamily: "monospace",
                        outline: "none",
                      }}
                    />
                    <button
                      className="webhook-test-btn"
                      onClick={() => testWebhook(integration.id)}
                      disabled={
                        config.testStatus === "testing" ||
                        config.url.trim().length === 0
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid var(--surface-border, #444)",
                        background:
                          config.testStatus === "success"
                            ? "rgba(16, 185, 129, 0.15)"
                            : config.testStatus === "error"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(255,255,255,0.04)",
                        color:
                          config.testStatus === "success"
                            ? "#10b981"
                            : config.testStatus === "error"
                            ? "#ef4444"
                            : "inherit",
                        cursor:
                          config.testStatus === "testing" ||
                          config.url.trim().length === 0
                            ? "not-allowed"
                            : "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "inherit",
                        opacity:
                          config.url.trim().length === 0 ? 0.3 : 1,
                        transition: "all 0.15s",
                        flexShrink: 0,
                      }}
                    >
                      {config.testStatus === "testing" ? (
                        <>
                          <Loader2
                            size={14}
                            style={{ animation: "webhookSpin 1s linear infinite" }}
                          />
                          Testing...
                        </>
                      ) : config.testStatus === "success" ? (
                        <>
                          <Check size={14} /> Success
                        </>
                      ) : config.testStatus === "error" ? (
                        <>
                          <AlertCircle size={14} /> Failed
                        </>
                      ) : (
                        <>
                          <ExternalLink size={14} /> Test
                        </>
                      )}
                    </button>
                  </div>

                  {/* Event type checkboxes */}
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Event Types
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {EVENT_TYPES.map((et) => {
                      const checked = config.events.includes(et.id);
                      return (
                        <button
                          key={et.id}
                          onClick={() => toggleEvent(integration.id, et.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: checked
                              ? `1px solid ${integration.color}55`
                              : "1px solid var(--surface-border, #444)",
                            background: checked
                              ? `${integration.color}12`
                              : "transparent",
                            color: "inherit",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: 12,
                            transition: "all 0.15s",
                          }}
                        >
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              border: checked
                                ? `2px solid ${integration.color}`
                                : "2px solid rgba(255,255,255,0.2)",
                              background: checked
                                ? integration.color
                                : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 0.15s",
                            }}
                          >
                            {checked && (
                              <Check size={10} color="#fff" strokeWidth={3} />
                            )}
                          </span>
                          <span style={{ opacity: 0.5, flexShrink: 0 }}>
                            {et.icon}
                          </span>
                          <span style={{ fontWeight: 500 }}>{et.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Last tested + clear */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11,
                      opacity: 0.4,
                    }}
                  >
                    <span>
                      {config.lastTestedAt
                        ? `Last tested: ${new Date(config.lastTestedAt).toLocaleString()}`
                        : "Not tested yet"}
                    </span>
                    <button
                      onClick={() => clearWebhook(integration.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 11,
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        opacity: 0.7,
                        padding: "2px 6px",
                      }}
                    >
                      <Trash2 size={11} /> Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save all button */}
      <button
        onClick={saveAll}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 20px",
          borderRadius: 12,
          border: "none",
          background: "var(--accent, #3b82f6)",
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
        {savedMsg ? (
          <>
            <Check size={16} /> Saved!
          </>
        ) : (
          <>
            <Save size={16} /> Save All Configurations
          </>
        )}
      </button>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes webhookSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
