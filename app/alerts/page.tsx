"use client";

import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import { useState, useEffect } from "react";
import { Plus, Trash2, Bell, BellOff, TrendingUp, TrendingDown, Bot, ToggleLeft, ToggleRight } from "lucide-react";
import { AGENT_CONFIGS } from "../../lib/agents/configs";

type AlertRuleType = "price-above" | "price-below" | "agent-signal";

type AlertRule = {
  id: string;
  type: AlertRuleType;
  symbol: string;
  threshold?: number;
  agentId?: string;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
};

const STORAGE_KEY = "zentrade_alert_rules_v1";

function loadRules(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveRules(rules: AlertRule[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); } catch {}
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<AlertRuleType>("price-above");
  const [formSymbol, setFormSymbol] = useState("");
  const [formThreshold, setFormThreshold] = useState("");
  const [formAgentId, setFormAgentId] = useState("");
  const [permissionStatus, setPermissionStatus] = useState<string>("default");

  useEffect(() => {
    setRules(loadRules());
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
    }
  };

  const addRule = () => {
    const rule: AlertRule = {
      id: crypto.randomUUID(),
      type: formType,
      symbol: formSymbol.trim().toUpperCase(),
      threshold: formType !== "agent-signal" ? parseFloat(formThreshold) || undefined : undefined,
      agentId: formType === "agent-signal" ? formAgentId : undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    if (!rule.symbol) return;
    const next = [rule, ...rules];
    setRules(next);
    saveRules(next);
    setShowForm(false);
    setFormSymbol("");
    setFormThreshold("");
  };

  const toggleRule = (id: string) => {
    const next = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(next);
    saveRules(next);
  };

  const deleteRule = (id: string) => {
    const next = rules.filter((r) => r.id !== id);
    setRules(next);
    saveRules(next);
  };

  const getTypeLabel = (type: AlertRuleType) => {
    switch (type) {
      case "price-above": return "Price Above";
      case "price-below": return "Price Below";
      case "agent-signal": return "Agent Signal";
    }
  };

  const getTypeIcon = (type: AlertRuleType) => {
    switch (type) {
      case "price-above": return <TrendingUp size={12} />;
      case "price-below": return <TrendingDown size={12} />;
      case "agent-signal": return <Bot size={12} />;
    }
  };

  return (
    <AuthGuard>
      <PageShell title="Alerts" subtitle="Set up price triggers and agent signal notifications">
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Permission banner */}
          {permissionStatus !== "granted" && (
            <div className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellOff size={14} className="text-[var(--negative)]" />
                <span className="text-xs text-[var(--ink)]">Browser notifications are {permissionStatus === "denied" ? "blocked" : "not enabled"}</span>
              </div>
              {permissionStatus !== "denied" && (
                <button
                  onClick={requestPermission}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "var(--accent-2)" }}
                >
                  Enable
                </button>
              )}
            </div>
          )}

          {/* Add button */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--ink)]">{rules.length} Alert Rule{rules.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "var(--accent-2)" }}
            >
              <Plus size={12} />
              New Rule
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="glass-card p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1 block">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as AlertRuleType)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] outline-none"
                  >
                    <option value="price-above">Price Above</option>
                    <option value="price-below">Price Below</option>
                    <option value="agent-signal">Agent Signal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1 block">Symbol</label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-[var(--ink)] border border-[var(--border)] outline-none"
                    maxLength={10}
                  />
                </div>
                {formType !== "agent-signal" ? (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1 block">Price ($)</label>
                    <input
                      type="number"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(e.target.value)}
                      placeholder="150.00"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-[var(--ink)] border border-[var(--border)] outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1 block">Agent</label>
                    <select
                      value={formAgentId}
                      onChange={(e) => setFormAgentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] outline-none"
                    >
                      <option value="">Any Agent</option>
                      {AGENT_CONFIGS.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={addRule}
                disabled={!formSymbol.trim()}
                className="w-full px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--accent-2)" }}
              >
                Add Alert Rule
              </button>
            </div>
          )}

          {/* Rules list */}
          {rules.length === 0 && !showForm ? (
            <div className="glass-card p-10 text-center">
              <Bell size={36} className="mx-auto mb-3 text-[var(--ink-muted)] opacity-50" />
              <h3 className="text-base font-semibold text-[var(--ink)] mb-1">No alert rules yet</h3>
              <p className="text-sm text-[var(--ink-muted)] max-w-sm mx-auto">
                Create price alerts or agent signal notifications to stay on top of market movements.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="glass-card p-3 flex items-center gap-3">
                  <div
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: rule.type === "price-above"
                        ? "color-mix(in srgb, var(--positive) 12%, transparent)"
                        : rule.type === "price-below"
                        ? "color-mix(in srgb, var(--negative) 12%, transparent)"
                        : "color-mix(in srgb, var(--accent-2) 12%, transparent)",
                      color: rule.type === "price-above" ? "var(--positive)" : rule.type === "price-below" ? "var(--negative)" : "var(--accent-2)",
                    }}
                  >
                    {getTypeIcon(rule.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--ink)]">{rule.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] text-[var(--ink-muted)] font-medium">
                        {getTypeLabel(rule.type)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                      {rule.type === "agent-signal"
                        ? `From: ${rule.agentId ? AGENT_CONFIGS.find((c) => c.id === rule.agentId)?.name : "Any agent"}`
                        : `Target: $${rule.threshold?.toFixed(2) || "—"}`}
                    </p>
                  </div>
                  <button onClick={() => toggleRule(rule.id)} className="p-1 text-[var(--ink-muted)]">
                    {rule.enabled ? <ToggleRight size={20} className="text-[var(--positive)]" /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--negative)] transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>
    </AuthGuard>
  );
}
