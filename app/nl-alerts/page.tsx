"use client";

import { useState, useEffect } from "react";
import PageShell from "../../components/PageShell";
import {
  Bell,
  BellOff,
  Trash2,
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Clock,
  Zap,
} from "lucide-react";
import {
  type NLAlert,
  type ParsedCondition,
  parseAlertText,
  getAlerts,
  saveAlert,
  deleteAlert,
  toggleAlert,
} from "../../lib/nl-alerts";

const EXAMPLES = [
  "Alert me when TSLA goes above 300",
  "Notify when AAPL drops below 170",
  "Tell me if NVDA crosses 900",
  "Warn me when MSFT falls below 400",
];

function OperatorIcon({ operator }: { operator: ParsedCondition["operator"] }) {
  switch (operator) {
    case "above":
      return <TrendingUp size={14} style={{ color: "var(--positive)" }} />;
    case "below":
      return <TrendingDown size={14} style={{ color: "var(--negative)" }} />;
    case "crosses":
      return <ArrowUpDown size={14} style={{ color: "var(--warning)" }} />;
  }
}

function formatParsed(parsed: ParsedCondition): string {
  const sym = parsed.symbol || "Any stock";
  const metric = parsed.metric === "price" ? "price" : parsed.metric;
  const op =
    parsed.operator === "above"
      ? "goes above"
      : parsed.operator === "below"
      ? "drops below"
      : "crosses";
  return `${sym} ${metric} ${op} ${parsed.value}`;
}

export default function NLAlertsPage() {
  const [alerts, setAlerts] = useState<NLAlert[]>([]);
  const [inputText, setInputText] = useState("");
  const [preview, setPreview] = useState<ParsedCondition | null>(null);
  const [parseError, setParseError] = useState(false);

  useEffect(() => {
    setAlerts(getAlerts());
  }, []);

  useEffect(() => {
    if (inputText.trim().length > 5) {
      const parsed = parseAlertText(inputText);
      if (parsed) {
        setPreview(parsed);
        setParseError(false);
      } else {
        setPreview(null);
        setParseError(true);
      }
    } else {
      setPreview(null);
      setParseError(false);
    }
  }, [inputText]);

  const handleAdd = () => {
    if (!preview) return;
    const alert: NLAlert = {
      id: `alert-${Date.now()}`,
      text: inputText.trim(),
      parsed: preview,
      active: true,
      createdAt: new Date().toISOString(),
    };
    saveAlert(alert);
    setAlerts(getAlerts());
    setInputText("");
    setPreview(null);
  };

  const handleToggle = (id: string) => {
    toggleAlert(id);
    setAlerts(getAlerts());
  };

  const handleDelete = (id: string) => {
    deleteAlert(id);
    setAlerts(getAlerts());
  };

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <PageShell
      title="Natural Language Alerts"
      subtitle="Describe your trading alerts in plain English"
      actions={
        <span
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{
            background: "var(--surface-2)",
            color: activeCount > 0 ? "var(--positive)" : "var(--ink-muted)",
            border: "1px solid var(--surface-border)",
          }}
        >
          <Bell size={14} />
          {activeCount} active
        </span>
      }
    >
      {/* Input section */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Create Alert
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Describe your alert in plain English..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && preview && handleAdd()}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: "var(--surface-2)",
              color: "var(--ink)",
              border: `1px solid ${parseError ? "var(--negative)" : "var(--surface-border)"}`,
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!preview}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent-2)", color: "#fff" }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {/* Parsed preview */}
        {preview && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--positive)",
              color: "var(--ink)",
            }}
          >
            <Zap size={14} style={{ color: "var(--positive)" }} />
            <span style={{ color: "var(--ink-muted)" }}>Parsed:</span>
            <span className="font-medium">{formatParsed(preview)}</span>
          </div>
        )}

        {parseError && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--negative)",
              color: "var(--negative)",
            }}
          >
            <AlertTriangle size={14} />
            Could not parse. Try something like &ldquo;Alert me when AAPL drops below 170&rdquo;
          </div>
        )}

        {/* Examples */}
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInputText(ex)}
                className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:opacity-80"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--ink-muted)",
                  border: "1px solid var(--surface-border)",
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div
          className="glass-card p-8 text-center"
          style={{ color: "var(--ink-muted)" }}
        >
          <BellOff size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No alerts created yet.</p>
          <p className="text-xs mt-1">
            Describe a condition in plain English above to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-card px-4 py-3 flex items-center gap-4"
              style={{ opacity: alert.active ? 1 : 0.5 }}
            >
              <OperatorIcon operator={alert.parsed.operator} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                  {alert.text}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {formatParsed(alert.parsed)}
                  </span>
                  {alert.lastTriggered && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--warning)" }}>
                      <Clock size={10} />
                      Triggered {new Date(alert.lastTriggered).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(alert.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  title={alert.active ? "Deactivate" : "Activate"}
                  style={{
                    color: alert.active ? "var(--positive)" : "var(--ink-muted)",
                    background: "var(--surface-2)",
                  }}
                >
                  {alert.active ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: "var(--negative)", background: "var(--surface-2)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
