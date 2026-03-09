"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Send,
  ToggleLeft,
  ToggleRight,
  Webhook,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  type WebhookConfig,
  WEBHOOK_EVENTS,
  getWebhooks,
  saveWebhook,
  deleteWebhook,
  testWebhook,
} from "../../lib/webhooks";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    setWebhooks(getWebhooks());
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormUrl("");
    setFormEvents([]);
    setShowForm(false);
  };

  const handleAdd = () => {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) return;

    const newHook: WebhookConfig = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: formName.trim(),
      url: formUrl.trim(),
      events: formEvents,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const updated = saveWebhook(newHook);
    setWebhooks(updated);
    resetForm();
  };

  const handleToggle = (id: string) => {
    const hook = webhooks.find((w) => w.id === id);
    if (!hook) return;
    const updated = saveWebhook({ ...hook, enabled: !hook.enabled });
    setWebhooks(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteWebhook(id);
    setWebhooks(updated);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleTest = async (hook: WebhookConfig) => {
    setTestingId(hook.id);
    setTestResults((prev) => ({ ...prev, [hook.id]: null }));
    const success = await testWebhook(hook);
    setTestResults((prev) => ({ ...prev, [hook.id]: success }));
    setTestingId(null);
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <AuthGuard>
      <PageShell
        title="Webhook Alerts"
        subtitle="Configure webhook endpoints to receive real-time notifications for trading events."
        actions={
          <button
            className="glass-card"
            onClick={() => setShowForm(!showForm)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--accent-2)",
              border: "1px solid var(--surface-border)",
              cursor: "pointer",
              background: "var(--surface)",
            }}
          >
            <Plus size={15} />
            Add Webhook
          </button>
        }
      >
        {/* Add Webhook Form */}
        {showForm && (
          <div
            className="glass-card"
            style={{
              padding: "20px",
              marginBottom: 20,
              border: "1px solid var(--surface-border)",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: "0.92rem",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              New Webhook
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Name */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    marginBottom: 4,
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Discord Trading Alerts"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.82rem",
                    borderRadius: 8,
                    border: "1px solid var(--surface-border)",
                    background: "var(--surface-2)",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                />
              </div>

              {/* URL */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    marginBottom: 4,
                  }}
                >
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://hooks.example.com/webhook"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.82rem",
                    borderRadius: 8,
                    border: "1px solid var(--surface-border)",
                    background: "var(--surface-2)",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Events */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    marginBottom: 8,
                  }}
                >
                  Events
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {WEBHOOK_EVENTS.map((ev) => {
                    const selected = formEvents.includes(ev.value);
                    return (
                      <label
                        key={ev.value}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: `1px solid ${selected ? "var(--accent-2)" : "var(--surface-border)"}`,
                          background: selected ? "var(--surface-2)" : "transparent",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          color: selected ? "var(--accent-2)" : "var(--ink-muted)",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleEvent(ev.value)}
                          style={{ display: "none" }}
                        />
                        {ev.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={handleAdd}
                  disabled={!formName.trim() || !formUrl.trim() || formEvents.length === 0}
                  style={{
                    padding: "8px 18px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "none",
                    background: "var(--accent-2)",
                    color: "#fff",
                    cursor:
                      !formName.trim() || !formUrl.trim() || formEvents.length === 0
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      !formName.trim() || !formUrl.trim() || formEvents.length === 0 ? 0.5 : 1,
                  }}
                >
                  Create Webhook
                </button>
                <button
                  onClick={resetForm}
                  style={{
                    padding: "8px 18px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "1px solid var(--surface-border)",
                    background: "transparent",
                    color: "var(--ink-muted)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhook List */}
        {webhooks.length === 0 && !showForm ? (
          <div
            className="glass-card"
            style={{
              padding: "48px 20px",
              textAlign: "center",
              border: "1px solid var(--surface-border)",
            }}
          >
            <Webhook size={36} style={{ color: "var(--ink-muted)", marginBottom: 12 }} />
            <p
              style={{
                margin: 0,
                fontSize: "0.92rem",
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              No webhooks configured
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "0.8rem",
                color: "var(--ink-muted)",
              }}
            >
              Add a webhook to receive real-time alerts for trading events.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {webhooks.map((hook) => {
              const isTesting = testingId === hook.id;
              const testResult = testResults[hook.id];

              return (
                <div
                  key={hook.id}
                  className="glass-card"
                  style={{
                    padding: "16px 18px",
                    border: "1px solid var(--surface-border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Status dot */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: hook.enabled ? "var(--positive)" : "var(--ink-muted)",
                      flexShrink: 0,
                    }}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {hook.name}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.74rem",
                        color: "var(--ink-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <ExternalLink size={11} />
                      {hook.url.length > 50 ? hook.url.slice(0, 50) + "..." : hook.url}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {hook.events.map((ev) => (
                        <span
                          key={ev}
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 500,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: "var(--surface-2)",
                            color: "var(--ink-muted)",
                            border: "1px solid var(--surface-border)",
                          }}
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Test result indicator */}
                  {testResult !== undefined && testResult !== null && (
                    <span style={{ flexShrink: 0 }}>
                      {testResult ? (
                        <CheckCircle size={16} style={{ color: "var(--positive)" }} />
                      ) : (
                        <XCircle size={16} style={{ color: "var(--negative)" }} />
                      )}
                    </span>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleTest(hook)}
                      disabled={isTesting}
                      title="Send test payload"
                      style={{
                        background: "none",
                        border: "1px solid var(--surface-border)",
                        borderRadius: 6,
                        padding: "5px 10px",
                        cursor: isTesting ? "not-allowed" : "pointer",
                        color: "var(--ink-muted)",
                        fontSize: "0.74rem",
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isTesting ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      Test
                    </button>

                    <button
                      onClick={() => handleToggle(hook.id)}
                      title={hook.enabled ? "Disable" : "Enable"}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: hook.enabled ? "var(--positive)" : "var(--ink-muted)",
                      }}
                    >
                      {hook.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>

                    <button
                      onClick={() => handleDelete(hook.id)}
                      title="Delete webhook"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: "var(--negative)",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
