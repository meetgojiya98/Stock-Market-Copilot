import { sendBrowserNotification } from "../browser-notifications";
import { createLocalAlert } from "../data-client";
import type { AgentSignal } from "./types";

export type AlertRuleType = "price-above" | "price-below" | "agent-signal" | "percent-change";

export type AlertRule = {
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
  } catch { /* ignore */ }
  return [];
}

function saveRules(rules: AlertRule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch { /* ignore */ }
}

export function getAlertRules(): AlertRule[] {
  return loadRules();
}

export function addAlertRule(rule: Omit<AlertRule, "id" | "createdAt">): AlertRule {
  const newRule: AlertRule = {
    ...rule,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const rules = loadRules();
  rules.unshift(newRule);
  saveRules(rules);
  return newRule;
}

export function removeAlertRule(id: string) {
  saveRules(loadRules().filter((r) => r.id !== id));
}

export function updateAlertRule(id: string, patch: Partial<AlertRule>) {
  const rules = loadRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rules[idx] = { ...rules[idx], ...patch };
    saveRules(rules);
  }
}

export function checkPriceAlerts(prices: Record<string, number>) {
  const rules = loadRules().filter((r) => r.enabled && (r.type === "price-above" || r.type === "price-below"));
  const now = new Date().toISOString();

  for (const rule of rules) {
    const price = prices[rule.symbol];
    if (price == null || rule.threshold == null) continue;

    // Don't re-trigger within 5 minutes
    if (rule.lastTriggered && Date.now() - Date.parse(rule.lastTriggered) < 300_000) continue;

    const triggered =
      (rule.type === "price-above" && price >= rule.threshold) ||
      (rule.type === "price-below" && price <= rule.threshold);

    if (triggered) {
      const dir = rule.type === "price-above" ? "above" : "below";
      const msg = `${rule.symbol} is ${dir} $${rule.threshold} (currently $${price.toFixed(2)})`;
      createLocalAlert(rule.symbol, msg, "price-alert");
      sendBrowserNotification("Price Alert", msg, { tag: `price-${rule.id}` });
      updateAlertRule(rule.id, { lastTriggered: now });
    }
  }
}

export function checkSignalAlerts(signals: AgentSignal[]) {
  const rules = loadRules().filter((r) => r.enabled && r.type === "agent-signal");

  for (const signal of signals) {
    for (const rule of rules) {
      if (rule.symbol && rule.symbol !== signal.symbol) continue;
      if (rule.agentId && rule.agentId !== signal.agentId) continue;
      if (rule.lastTriggered && Date.now() - Date.parse(rule.lastTriggered) < 300_000) continue;

      const msg = `${signal.agentId}: ${signal.message}`;
      createLocalAlert(signal.symbol, msg, "agent-alert");
      sendBrowserNotification("Agent Alert", msg, { tag: `signal-${rule.id}` });
      updateAlertRule(rule.id, { lastTriggered: new Date().toISOString() });
    }
  }
}
