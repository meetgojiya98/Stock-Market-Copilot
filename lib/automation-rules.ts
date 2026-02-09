"use client";

export type AutomationCondition =
  | "price_above"
  | "price_below"
  | "position_drawdown"
  | "thesis_invalidated";
export type AutomationAction = "notify" | "daily_brief" | "risk_escalation";
export type AutomationRuleStatus = "active" | "paused";

export type AutomationRule = {
  id: string;
  name: string;
  symbol: string;
  condition: AutomationCondition;
  threshold: number;
  action: AutomationAction;
  cooldownMins: number;
  status: AutomationRuleStatus;
  createdAt: string;
  lastTriggeredAt?: string;
};

type LocalResult<T> = {
  ok: boolean;
  data: T;
  mode: "local";
  detail?: string;
};

type RuleEvalPosition = {
  symbol: string;
  shares: number;
  averagePrice: number;
  marketPrice: number;
  unrealizedPct: number;
};

type RuleEvalContext = {
  quotes: Record<string, { price: number; changePct: number }>;
  positions: RuleEvalPosition[];
  thesisStatusBySymbol: Record<string, "active" | "invalidated">;
};

export type TriggeredAutomation = {
  ruleId: string;
  symbol: string;
  message: string;
  severity: "info" | "critical";
};

const STORAGE_KEY = "smc_automation_rules_v1";

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function sanitizeRule(raw: unknown): AutomationRule | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<AutomationRule>;
  const symbol = normalizeSymbol(String(candidate.symbol ?? ""));
  const name = String(candidate.name ?? "").trim();
  const threshold = Number(candidate.threshold ?? 0);
  const cooldownMins = Number(candidate.cooldownMins ?? 60);

  if (!symbol || !name) return null;

  const condition: AutomationCondition =
    candidate.condition === "price_above" ||
    candidate.condition === "price_below" ||
    candidate.condition === "position_drawdown" ||
    candidate.condition === "thesis_invalidated"
      ? candidate.condition
      : "price_above";
  const action: AutomationAction =
    candidate.action === "daily_brief" ||
    candidate.action === "risk_escalation"
      ? candidate.action
      : "notify";

  return {
    id: String(candidate.id ?? `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name,
    symbol,
    condition,
    action,
    threshold: Number.isFinite(threshold) ? threshold : 0,
    cooldownMins: clamp(Math.floor(cooldownMins) || 60, 1, 24 * 60),
    status: candidate.status === "paused" ? "paused" : "active",
    createdAt: String(candidate.createdAt ?? nowIso()),
    ...(candidate.lastTriggeredAt ? { lastTriggeredAt: String(candidate.lastTriggeredAt) } : {}),
  };
}

function readRules() {
  const raw = safeRead<AutomationRule[]>(STORAGE_KEY, []);
  return raw
    .map((item) => sanitizeRule(item))
    .filter((item): item is AutomationRule => Boolean(item))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function writeRules(rules: AutomationRule[]) {
  safeWrite(
    STORAGE_KEY,
    rules
      .map((item) => sanitizeRule(item))
      .filter((item): item is AutomationRule => Boolean(item))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  );
}

export async function fetchAutomationRules(): Promise<LocalResult<AutomationRule[]>> {
  return {
    ok: true,
    data: readRules(),
    mode: "local",
  };
}

export async function saveAutomationRule(input: {
  name: string;
  symbol: string;
  condition: AutomationCondition;
  threshold?: number;
  action: AutomationAction;
  cooldownMins?: number;
}): Promise<LocalResult<AutomationRule[]> & { rule?: AutomationRule }> {
  const name = input.name.trim();
  const symbol = normalizeSymbol(input.symbol);
  const threshold = Number(input.threshold ?? 0);
  const cooldownMins = clamp(Math.floor(Number(input.cooldownMins ?? 60)), 1, 24 * 60);

  const rules = readRules();
  if (!name || !symbol) {
    return {
      ok: false,
      data: rules,
      mode: "local",
      detail: "Rule name and symbol are required.",
    };
  }

  const rule: AutomationRule = {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    symbol,
    condition: input.condition,
    action: input.action,
    threshold:
      input.condition === "thesis_invalidated"
        ? 0
        : Number.isFinite(threshold)
        ? threshold
        : 0,
    cooldownMins,
    status: "active",
    createdAt: nowIso(),
  };

  const next = [rule, ...rules];
  writeRules(next);

  return {
    ok: true,
    data: next,
    mode: "local",
    rule,
  };
}

export async function deleteAutomationRule(ruleId: string): Promise<LocalResult<AutomationRule[]>> {
  const rules = readRules();
  const next = rules.filter((item) => item.id !== ruleId);
  writeRules(next);
  return {
    ok: true,
    data: next,
    mode: "local",
  };
}

export async function toggleAutomationRule(
  ruleId: string
): Promise<LocalResult<AutomationRule[]> & { rule?: AutomationRule }> {
  const rules = readRules();
  const index = rules.findIndex((item) => item.id === ruleId);
  if (index < 0) {
    return {
      ok: false,
      data: rules,
      mode: "local",
      detail: "Rule not found.",
    };
  }

  const next = [...rules];
  next[index] = {
    ...next[index],
    status: next[index].status === "active" ? "paused" : "active",
  };
  writeRules(next);

  return {
    ok: true,
    data: next,
    mode: "local",
    rule: next[index],
  };
}

function isCoolingDown(rule: AutomationRule, now: Date) {
  if (!rule.lastTriggeredAt) return false;
  const last = Date.parse(rule.lastTriggeredAt);
  if (!Number.isFinite(last)) return false;
  const deltaMs = now.getTime() - last;
  return deltaMs < rule.cooldownMins * 60 * 1000;
}

function evaluateCondition(rule: AutomationRule, context: RuleEvalContext) {
  const quote = context.quotes[rule.symbol];
  const position = context.positions.find((item) => item.symbol === rule.symbol);
  const thesisStatus = context.thesisStatusBySymbol[rule.symbol];

  if (rule.condition === "price_above") {
    if (!quote || quote.price <= 0) return null;
    return quote.price >= rule.threshold
      ? `${rule.symbol} crossed above ${rule.threshold.toFixed(2)} (last ${quote.price.toFixed(2)}).`
      : null;
  }

  if (rule.condition === "price_below") {
    if (!quote || quote.price <= 0) return null;
    return quote.price <= rule.threshold
      ? `${rule.symbol} broke below ${rule.threshold.toFixed(2)} (last ${quote.price.toFixed(2)}).`
      : null;
  }

  if (rule.condition === "position_drawdown") {
    if (!position) return null;
    return position.unrealizedPct <= -Math.abs(rule.threshold)
      ? `${rule.symbol} unrealized drawdown hit ${position.unrealizedPct.toFixed(2)}%.`
      : null;
  }

  return thesisStatus === "invalidated"
    ? `${rule.symbol} thesis is marked invalidated.`
    : null;
}

function actionPrefix(action: AutomationAction) {
  if (action === "daily_brief") return "Daily brief";
  if (action === "risk_escalation") return "Risk escalation";
  return "Automation alert";
}

export async function evaluateAutomationRules(
  context: RuleEvalContext
): Promise<
  LocalResult<AutomationRule[]> & {
    triggered: TriggeredAutomation[];
  }
> {
  const now = new Date();
  const rules = readRules();
  const triggered: TriggeredAutomation[] = [];

  const nextRules = rules.map((rule) => {
    if (rule.status !== "active") return rule;
    if (isCoolingDown(rule, now)) return rule;

    const reason = evaluateCondition(rule, context);
    if (!reason) return rule;

    const severity = rule.action === "risk_escalation" ? "critical" : "info";
    triggered.push({
      ruleId: rule.id,
      symbol: rule.symbol,
      severity,
      message: `${actionPrefix(rule.action)}: ${rule.name}. ${reason}`,
    });

    return {
      ...rule,
      lastTriggeredAt: nowIso(),
    };
  });

  if (triggered.length) {
    writeRules(nextRules);
  }

  return {
    ok: true,
    data: nextRules,
    mode: "local",
    triggered,
  };
}
