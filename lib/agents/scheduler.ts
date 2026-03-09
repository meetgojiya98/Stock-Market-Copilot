import type { AgentInstance } from "./types";

export type ScheduleInterval = "15m" | "1h" | "4h" | "market-open" | "market-close";

export type ScheduleConfig = {
  instanceId: string;
  interval: ScheduleInterval;
  enabled: boolean;
  lastTriggered?: string;
};

const STORAGE_KEY = "zentrade_agent_schedules_v1";
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

function loadSchedules(): ScheduleConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveSchedules(schedules: ScheduleConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch { /* ignore */ }
}

export function getSchedules(): ScheduleConfig[] {
  return loadSchedules();
}

export function setSchedule(config: ScheduleConfig) {
  const all = loadSchedules();
  const idx = all.findIndex((s) => s.instanceId === config.instanceId);
  if (idx >= 0) all[idx] = config;
  else all.push(config);
  saveSchedules(all);
}

export function removeSchedule(instanceId: string) {
  saveSchedules(loadSchedules().filter((s) => s.instanceId !== instanceId));
}

function getIntervalMs(interval: ScheduleInterval): number {
  switch (interval) {
    case "15m": return 15 * 60 * 1000;
    case "1h": return 60 * 60 * 1000;
    case "4h": return 4 * 60 * 60 * 1000;
    default: return 0;
  }
}

function isMarketTime(type: "market-open" | "market-close"): boolean {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = now.getDay();
  if (day < 1 || day > 5) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  if (type === "market-open") return mins >= 570 && mins <= 575; // 9:30-9:35 AM ET
  return mins >= 960 && mins <= 965; // 4:00-4:05 PM ET
}

export function checkSchedules(
  instances: AgentInstance[],
  onTrigger: (instanceId: string) => void
) {
  const schedules = loadSchedules();
  const now = Date.now();

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    const instance = instances.find((i) => i.id === schedule.instanceId);
    if (!instance || instance.status === "running") continue;

    let shouldTrigger = false;

    if (schedule.interval === "market-open" || schedule.interval === "market-close") {
      shouldTrigger = isMarketTime(schedule.interval);
      if (shouldTrigger && schedule.lastTriggered) {
        const last = Date.parse(schedule.lastTriggered);
        if (now - last < 600_000) shouldTrigger = false; // Don't re-trigger within 10 min
      }
    } else {
      const intervalMs = getIntervalMs(schedule.interval);
      const lastRun = schedule.lastTriggered ? Date.parse(schedule.lastTriggered) : 0;
      shouldTrigger = now - lastRun >= intervalMs;
    }

    if (shouldTrigger) {
      schedule.lastTriggered = new Date().toISOString();
      saveSchedules(schedules);
      onTrigger(schedule.instanceId);
    }
  }
}

export function startScheduler(
  getInstances: () => AgentInstance[],
  onTrigger: (instanceId: string) => void
) {
  stopScheduler();
  schedulerTimer = setInterval(() => {
    checkSchedules(getInstances(), onTrigger);
  }, 60_000);
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
