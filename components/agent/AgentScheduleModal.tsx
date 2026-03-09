"use client";

import { useState, useEffect } from "react";
import { X, Clock, Check } from "lucide-react";

type ScheduleInterval = "15m" | "1h" | "4h" | "market-open" | "market-close";

type ScheduleConfig = {
  instanceId: string;
  interval: ScheduleInterval;
  enabled: boolean;
  lastTriggered?: string;
};

const STORAGE_KEY = "zentrade_agent_schedules_v1";

const INTERVALS: { value: ScheduleInterval; label: string; desc: string }[] = [
  { value: "15m", label: "Every 15 min", desc: "High frequency monitoring" },
  { value: "1h", label: "Every hour", desc: "Standard monitoring" },
  { value: "4h", label: "Every 4 hours", desc: "Low frequency checks" },
  { value: "market-open", label: "Market Open", desc: "9:30 AM ET daily" },
  { value: "market-close", label: "Market Close", desc: "4:00 PM ET daily" },
];

function loadSchedules(): ScheduleConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSchedules(schedules: ScheduleConfig[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules)); } catch {}
}

export default function AgentScheduleModal({
  instanceId,
  agentName,
  onClose,
}: {
  instanceId: string;
  agentName: string;
  onClose: () => void;
}) {
  const [interval, setInterval_] = useState<ScheduleInterval>("1h");
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const schedules = loadSchedules();
    const existing = schedules.find((s) => s.instanceId === instanceId);
    if (existing) {
      setInterval_(existing.interval);
      setEnabled(existing.enabled);
    }
  }, [instanceId]);

  const handleSave = () => {
    const schedules = loadSchedules();
    const idx = schedules.findIndex((s) => s.instanceId === instanceId);
    const config: ScheduleConfig = { instanceId, interval, enabled };
    if (idx >= 0) schedules[idx] = config;
    else schedules.push(config);
    saveSchedules(schedules);
    setSaved(true);
    setTimeout(onClose, 1000);
  };

  const handleRemove = () => {
    const schedules = loadSchedules().filter((s) => s.instanceId !== instanceId);
    saveSchedules(schedules);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-[min(420px,90vw)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[var(--accent-2)]" />
            <span className="text-sm font-bold text-[var(--ink)]">Schedule: {agentName}</span>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {INTERVALS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setInterval_(opt.value)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border transition-all"
              style={{
                borderColor: interval === opt.value ? "var(--accent-2)" : "var(--border)",
                background: interval === opt.value ? "color-mix(in srgb, var(--accent-2) 8%, transparent)" : "transparent",
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: interval === opt.value ? "var(--accent-2)" : "var(--ink-muted)",
                }}
              >
                {interval === opt.value && <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent-2)" }} />}
              </div>
              <div>
                <span className="text-xs font-semibold text-[var(--ink)]">{opt.label}</span>
                <p className="text-[10px] text-[var(--ink-muted)]">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleRemove}
            className="px-3 py-2 rounded-xl text-xs font-medium text-[var(--negative)] hover:bg-[color-mix(in_srgb,var(--negative)_8%,transparent)] transition-colors"
          >
            Remove Schedule
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: saved ? "var(--positive)" : "var(--accent-2)" }}
          >
            {saved ? <Check size={13} /> : <Clock size={13} />}
            {saved ? "Saved!" : "Save Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
