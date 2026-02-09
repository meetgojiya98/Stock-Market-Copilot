"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClockCheck,
  BellRing,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { createLocalAlert } from "../lib/data-client";
import {
  deleteAutomationRule,
  evaluateAutomationRules,
  fetchAutomationRules,
  saveAutomationRule,
  toggleAutomationRule,
  type AutomationAction,
  type AutomationCondition,
  type AutomationRule,
} from "../lib/automation-rules";
import { fetchThesisLibrary } from "../lib/thesis-memory";
import type { PaperTradingLedger } from "../lib/paper-trading";

type AutomationRulesLabProps = {
  ledger: PaperTradingLedger;
  quotes: Record<string, { price: number; changePct: number }>;
  symbols: string[];
};

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function conditionLabel(condition: AutomationCondition) {
  if (condition === "price_above") return "Price Above";
  if (condition === "price_below") return "Price Below";
  if (condition === "position_drawdown") return "Position Drawdown";
  return "Thesis Invalidated";
}

function actionLabel(action: AutomationAction) {
  if (action === "daily_brief") return "Daily Brief";
  if (action === "risk_escalation") return "Risk Escalation";
  return "Notify";
}

export default function AutomationRulesLab({
  ledger,
  quotes,
  symbols,
}: AutomationRulesLabProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState(symbols[0] || "AAPL");
  const [condition, setCondition] = useState<AutomationCondition>("price_above");
  const [threshold, setThreshold] = useState("0");
  const [action, setAction] = useState<AutomationAction>("notify");
  const [cooldownMins, setCooldownMins] = useState("60");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [thesisStatusBySymbol, setThesisStatusBySymbol] = useState<
    Record<string, "active" | "invalidated">
  >({});

  const symbolOptions = useMemo(
    () =>
      [...new Set(symbols.map(normalizeSymbol).filter(Boolean))].slice(0, 24).sort(),
    [symbols]
  );

  const positionContext = useMemo(
    () =>
      ledger.positions.map((position) => {
        const marketPrice =
          quotes[position.symbol]?.price && quotes[position.symbol].price > 0
            ? quotes[position.symbol].price
            : position.averagePrice;
        const unrealizedPct =
          position.averagePrice > 0
            ? ((marketPrice - position.averagePrice) / position.averagePrice) * 100
            : 0;
        return {
          symbol: normalizeSymbol(position.symbol),
          shares: position.shares,
          averagePrice: position.averagePrice,
          marketPrice,
          unrealizedPct,
        };
      }),
    [ledger.positions, quotes]
  );

  const refreshRules = useCallback(async () => {
    const result = await fetchAutomationRules();
    setRules(result.data);
  }, []);

  const refreshThesisStatus = useCallback(async () => {
    const library = await fetchThesisLibrary();
    const latestBySymbol: Record<string, "active" | "invalidated"> = {};
    library.data.versions.forEach((version) => {
      const key = normalizeSymbol(version.symbol);
      if (!latestBySymbol[key]) {
        latestBySymbol[key] = version.status;
      }
    });
    setThesisStatusBySymbol(latestBySymbol);
  }, []);

  const runEvaluation = useCallback(async () => {
    const result = await evaluateAutomationRules({
      quotes,
      positions: positionContext,
      thesisStatusBySymbol,
    });

    setRules(result.data);
    if (!result.triggered.length) return;

    result.triggered.forEach((trigger) => {
      createLocalAlert(
        trigger.symbol,
        trigger.message,
        trigger.severity === "critical" ? "critical" : "automation"
      );
    });

    setNotice(`${result.triggered.length} automation rule(s) triggered.`);
  }, [positionContext, quotes, thesisStatusBySymbol]);

  useEffect(() => {
    refreshRules();
    refreshThesisStatus();
  }, [refreshRules, refreshThesisStatus]);

  useEffect(() => {
    const id = window.setInterval(() => {
      runEvaluation();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [runEvaluation]);

  useEffect(() => {
    if (!symbolOptions.length) return;
    if (symbolOptions.includes(symbol)) return;
    setSymbol(symbolOptions[0]);
  }, [symbol, symbolOptions]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const parsedThreshold = Number(threshold);
      const parsedCooldown = Number(cooldownMins);
      const result = await saveAutomationRule({
        name,
        symbol,
        condition,
        threshold:
          condition === "thesis_invalidated"
            ? 0
            : Number.isFinite(parsedThreshold)
            ? parsedThreshold
            : 0,
        action,
        cooldownMins: Number.isFinite(parsedCooldown) ? parsedCooldown : 60,
      });

      setRules(result.data);
      if (!result.ok) {
        setError(result.detail || "Unable to save automation rule.");
        return;
      }

      setName("");
      setThreshold("0");
      setCooldownMins("60");
      setNotice(`Automation rule created for ${normalizeSymbol(symbol)}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (ruleId: string) => {
    const result = await toggleAutomationRule(ruleId);
    setRules(result.data);
    if (!result.ok) {
      setError(result.detail || "Unable to toggle rule.");
      return;
    }
    setNotice(
      result.rule?.status === "active"
        ? "Rule resumed."
        : "Rule paused."
    );
  };

  const handleDelete = async (ruleId: string) => {
    const result = await deleteAutomationRule(ruleId);
    setRules(result.data);
    setNotice("Rule removed.");
  };

  const handleEvaluateNow = async () => {
    setError("");
    await refreshThesisStatus();
    await runEvaluation();
    await refreshRules();
  };

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <AlarmClockCheck size={16} />
          Automation Layer (No-Code Rules)
        </h3>
        <button
          onClick={handleEvaluateNow}
          className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-1.5 text-xs"
        >
          <RefreshCw size={12} />
          Evaluate Now
        </button>
      </div>

      <p className="text-xs muted">
        Define rules like "If X happens, do Y" for alerts, daily briefs, and risk escalation.
      </p>

      {(notice || error) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <form onSubmit={handleCreate} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
        <label className="text-xs space-y-1">
          <div className="muted">Rule Name</div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            placeholder="Breakout Alert"
            required
          />
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Symbol</div>
          <select
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          >
            {symbolOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Condition</div>
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value as AutomationCondition)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          >
            <option value="price_above">Price Above</option>
            <option value="price_below">Price Below</option>
            <option value="position_drawdown">Position Drawdown %</option>
            <option value="thesis_invalidated">Thesis Invalidated</option>
          </select>
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Threshold</div>
          <input
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            type="number"
            step={0.01}
            disabled={condition === "thesis_invalidated"}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            placeholder={condition === "position_drawdown" ? "6" : "200"}
          />
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Action</div>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as AutomationAction)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          >
            <option value="notify">Notify</option>
            <option value="daily_brief">Daily Brief</option>
            <option value="risk_escalation">Risk Escalation</option>
          </select>
        </label>

        <label className="text-xs space-y-1">
          <div className="muted">Cooldown (mins)</div>
          <input
            value={cooldownMins}
            onChange={(event) => setCooldownMins(event.target.value)}
            type="number"
            min={1}
            max={1440}
            step={1}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 xl:col-span-3 inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)] text-white px-3 py-2 text-sm font-semibold disabled:opacity-70"
        >
          <Plus size={13} />
          {loading ? "Saving..." : "Create Rule"}
        </button>
      </form>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs muted">
            <tr>
              <th className="text-left py-2">Rule</th>
              <th className="text-left py-2">Condition</th>
              <th className="text-left py-2">Action</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Last Trigger</th>
              <th className="text-right py-2">Controls</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs muted">
                  No automation rules yet.
                </td>
              </tr>
            )}

            {rules.map((rule) => (
              <tr key={rule.id} className="border-t border-[var(--surface-border)]">
                <td className="py-2">
                  <div className="font-semibold">{rule.name}</div>
                  <div className="text-xs muted">{rule.symbol}</div>
                </td>
                <td className="py-2 text-xs">
                  {conditionLabel(rule.condition)}
                  {rule.condition !== "thesis_invalidated" ? ` ${rule.threshold}` : ""}
                </td>
                <td className="py-2 text-xs">{actionLabel(rule.action)}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      rule.status === "active" ? "badge-positive" : "badge-neutral"
                    }`}
                  >
                    {rule.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 text-xs muted">{formatDate(rule.lastTriggeredAt)}</td>
                <td className="py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(rule.id)}
                      className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-2 py-1 text-[11px]"
                    >
                      {rule.status === "active" ? <PauseCircle size={11} /> : <PlayCircle size={11} />}
                      {rule.status === "active" ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2 py-1 text-[11px]"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs muted rounded-lg control-surface bg-white/70 dark:bg-black/25 px-3 py-2">
        <BellRing size={12} className="inline mr-1" />
        Triggered rules automatically publish to the Notifications stream.
      </div>
    </section>
  );
}
