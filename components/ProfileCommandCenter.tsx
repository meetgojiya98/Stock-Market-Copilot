"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  BriefcaseBusiness,
  CircleCheckBig,
  Clock3,
  LayoutDashboard,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react";
import {
  fetchNotificationsData,
  fetchPortfolioData,
  fetchWatchlistData,
} from "../lib/data-client";
import { getAuthModeLabel } from "../lib/auth-client";

type PortfolioRow = {
  symbol: string;
  shares: number;
};

type WatchlistRow = {
  symbol: string;
};

type NotificationRow = {
  id?: string;
  symbol: string;
  message: string;
  time: string;
  type?: string;
};

type ProfilePreferences = {
  displayName: string;
  riskProfile: "defensive" | "balanced" | "aggressive";
  experienceTier: "starter" | "active" | "pro";
  strategyFocus: "trend" | "swing" | "value" | "event-driven";
  preferredSectors: string[];
  dailyDigest: boolean;
  digestTime: string;
  aiAutomation: boolean;
  compactLayout: boolean;
  stealthMode: boolean;
};

type LocalAuthUser = {
  email: string;
  username: string;
  password: string;
  createdAt: string;
};

type StoredPreferences = Record<string, ProfilePreferences>;

const LOCAL_USERS_KEY = "smc_local_auth_users_v1";
const LOCAL_ACTIVE_KEY = "smc_local_auth_active_user_v1";
const PREFERENCES_KEY = "smc_profile_preferences_v1";

const SECTOR_OPTIONS = [
  "Technology",
  "Semiconductors",
  "AI Infrastructure",
  "Financials",
  "Healthcare",
  "Energy",
  "Industrials",
  "Consumer",
];

const DEFAULT_PREFERENCES: ProfilePreferences = {
  displayName: "Market Operator",
  riskProfile: "balanced",
  experienceTier: "active",
  strategyFocus: "trend",
  preferredSectors: ["Technology", "Semiconductors"],
  dailyDigest: true,
  digestTime: "08:30",
  aiAutomation: true,
  compactLayout: false,
  stealthMode: false,
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function scopeFromEmail(email: string) {
  return email.trim().toLowerCase() || "__default__";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function prettyDate(value?: string) {
  if (!value) return "Unknown";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Unknown";
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function prettyTime(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Unknown";
  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialsFromName(name: string) {
  const chunks = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!chunks.length) return "MO";
  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? "").join("");
}

export default function ProfileCommandCenter() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("market-operator");
  const [createdAt, setCreatedAt] = useState("");
  const [authMode, setAuthMode] = useState("Remote Mode");
  const [dataMode, setDataMode] = useState<"remote" | "local">("remote");
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [syncNotice, setSyncNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveNote, setSaveNote] = useState("");
  const [preferences, setPreferences] = useState<ProfilePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const activeEmail = localStorage.getItem(LOCAL_ACTIVE_KEY) ?? "";
    const users = safeJsonParse<LocalAuthUser[]>(localStorage.getItem(LOCAL_USERS_KEY), []);
    const matchedUser = users.find((user) => user.email === activeEmail);
    const fallbackName = activeEmail ? activeEmail.split("@")[0] : DEFAULT_PREFERENCES.displayName;

    const storedPreferences = safeJsonParse<StoredPreferences>(
      localStorage.getItem(PREFERENCES_KEY),
      {}
    );
    const scoped = storedPreferences[scopeFromEmail(activeEmail)];
    const { displayName: storedDisplayName, ...scopedRest } = scoped ?? {};

    setEmail(activeEmail);
    setUsername(matchedUser?.username || fallbackName || "market-operator");
    setCreatedAt(matchedUser?.createdAt || "");
    setAuthMode(getAuthModeLabel());
    setPreferences({
      ...DEFAULT_PREFERENCES,
      ...scopedRest,
      displayName:
        storedDisplayName || matchedUser?.username || fallbackName || DEFAULT_PREFERENCES.displayName,
    });

    let active = true;
    const token = localStorage.getItem("access_token") || undefined;

    const hydrate = async () => {
      try {
        const [portfolioResult, watchlistResult, notificationsResult] = await Promise.all([
          fetchPortfolioData(token),
          fetchWatchlistData(token),
          fetchNotificationsData(token),
        ]);

        if (!active) return;

        setPortfolio(portfolioResult.data as PortfolioRow[]);
        setWatchlist(watchlistResult.data as WatchlistRow[]);
        setNotifications(notificationsResult.data as NotificationRow[]);

        const modes = [portfolioResult.mode, watchlistResult.mode, notificationsResult.mode];
        setDataMode(modes.every((mode) => mode === "remote") ? "remote" : "local");

        const firstNotice = [
          portfolioResult.detail,
          watchlistResult.detail,
          notificationsResult.detail,
        ].find(Boolean);
        setSyncNotice(
          firstNotice ||
            (modes.includes("local")
              ? "Partial fallback active: some modules are running in Local Mode."
              : "")
        );
      } catch {
        if (!active) return;
        setSyncNotice("Unable to hydrate profile intelligence right now.");
      } finally {
        if (active) setLoading(false);
      }
    };

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!saveNote) return;
    const timeoutId = window.setTimeout(() => setSaveNote(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [saveNote]);

  const totalShares = useMemo(
    () => portfolio.reduce((sum, row) => sum + (Number.isFinite(row.shares) ? row.shares : 0), 0),
    [portfolio]
  );

  const focusSymbols = useMemo(
    () => [...portfolio].sort((a, b) => b.shares - a.shares).slice(0, 5),
    [portfolio]
  );

  const concentration = useMemo(() => {
    if (!focusSymbols.length || !totalShares) return 0;
    return focusSymbols[0].shares / totalShares;
  }, [focusSymbols, totalShares]);

  const alerts24h = useMemo(() => {
    const now = Date.now();
    return notifications.filter((item) => now - Date.parse(item.time) < 86_400_000).length;
  }, [notifications]);

  const accountAgeDays = useMemo(() => {
    if (!createdAt) return 0;
    const parsed = Date.parse(createdAt);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
  }, [createdAt]);

  const diversificationScore = useMemo(() => {
    if (!portfolio.length || !totalShares) return 18;
    const weightedConcentration = portfolio.reduce((sum, row) => {
      const weight = row.shares / totalShares;
      return sum + weight * weight;
    }, 0);
    return clamp(Math.round((1 - weightedConcentration) * 140), 18, 96);
  }, [portfolio, totalShares]);

  const engagementScore = useMemo(() => {
    const base =
      portfolio.length * 9 +
      watchlist.length * 5 +
      Math.min(18, alerts24h * 3) +
      (preferences.aiAutomation ? 10 : 0) +
      (preferences.dailyDigest ? 8 : 0);
    return clamp(base, 14, 99);
  }, [portfolio.length, watchlist.length, alerts24h, preferences.aiAutomation, preferences.dailyDigest]);

  const accountTier = useMemo(() => {
    if (accountAgeDays > 365) return "Institutional Rhythm";
    if (accountAgeDays > 120) return "Mature Operator";
    if (accountAgeDays > 30) return "Scaling Trader";
    return "Early Buildout";
  }, [accountAgeDays]);

  function updatePreference<K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSector(sector: string) {
    setPreferences((prev) => {
      const exists = prev.preferredSectors.includes(sector);
      const nextSectors = exists
        ? prev.preferredSectors.filter((item) => item !== sector)
        : [...prev.preferredSectors, sector];

      return {
        ...prev,
        preferredSectors: nextSectors.slice(0, 5),
      };
    });
  }

  function savePreferences() {
    const key = scopeFromEmail(email);
    const existing = safeJsonParse<StoredPreferences>(localStorage.getItem(PREFERENCES_KEY), {});
    existing[key] = preferences;
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(existing));
    setSaveNote("Preferences synced");
  }

  function resetPreferences() {
    setPreferences((prev) => ({
      ...DEFAULT_PREFERENCES,
      displayName: prev.displayName || DEFAULT_PREFERENCES.displayName,
    }));
    setSaveNote("Defaults restored");
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-5 sm:p-6 grid lg:grid-cols-[1.35fr_0.95fr] gap-5 fade-up">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-5">
          <div className="absolute -top-14 -right-10 w-52 h-52 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white grid place-items-center font-semibold">
                {initialsFromName(preferences.displayName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.12em] muted">Trader Identity</p>
                <h2 className="text-xl font-semibold section-title truncate">{preferences.displayName}</h2>
                <p className="muted text-sm truncate">{email || "No active email captured"}</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <span className="rounded-full px-3 py-1 text-xs font-semibold border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/25 inline-flex items-center gap-1">
                <ShieldCheck size={13} />
                {authMode}
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/25 inline-flex items-center gap-1">
                <Radar size={13} />
                {dataMode === "remote" ? "Remote Sync" : "Local Fallback"}
              </span>
            </div>
          </div>

          <div className="relative mt-5 grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-3">
              <p className="muted text-xs uppercase tracking-[0.08em]">Alias</p>
              <p className="font-semibold mt-1">{username}</p>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-3">
              <p className="muted text-xs uppercase tracking-[0.08em]">Member Since</p>
              <p className="font-semibold mt-1">{prettyDate(createdAt)}</p>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-3">
              <p className="muted text-xs uppercase tracking-[0.08em]">Tier</p>
              <p className="font-semibold mt-1">{accountTier}</p>
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-2 text-xs muted">
            <CircleCheckBig size={14} className="text-[var(--positive)]" />
            Session integrity healthy · account age {accountAgeDays} days
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.12em] muted">Posture Snapshot</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/80 dark:bg-black/25 border border-black/10 dark:border-white/10 p-3">
              <p className="text-xs muted">Positions</p>
              <p className="mt-1 text-lg font-semibold metric-value">{portfolio.length}</p>
            </div>
            <div className="rounded-xl bg-white/80 dark:bg-black/25 border border-black/10 dark:border-white/10 p-3">
              <p className="text-xs muted">Watchlist</p>
              <p className="mt-1 text-lg font-semibold metric-value">{watchlist.length}</p>
            </div>
            <div className="rounded-xl bg-white/80 dark:bg-black/25 border border-black/10 dark:border-white/10 p-3">
              <p className="text-xs muted">Alerts (24h)</p>
              <p className="mt-1 text-lg font-semibold metric-value">{alerts24h}</p>
            </div>
            <div className="rounded-xl bg-white/80 dark:bg-black/25 border border-black/10 dark:border-white/10 p-3">
              <p className="text-xs muted">Total Shares</p>
              <p className="mt-1 text-lg font-semibold metric-value">{Math.round(totalShares)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">Diversification index</span>
                <span className="font-semibold metric-value">{diversificationScore}/100</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)]"
                  style={{ width: `${diversificationScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="muted">Engagement score</span>
                <span className="font-semibold metric-value">{engagementScore}/100</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]"
                  style={{ width: `${engagementScore}%` }}
                />
              </div>
            </div>
          </div>

          {syncNotice && (
            <p className="mt-4 text-xs rounded-lg border border-fuchsia-300/50 bg-fuchsia-500/10 text-fuchsia-900 dark:text-fuchsia-200 px-3 py-2">
              {syncNotice}
            </p>
          )}
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="surface-panel p-5 sm:p-6 fade-up">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-semibold section-title inline-flex items-center gap-2">
              <Workflow size={18} />
              Strategy Controls
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={resetPreferences}
                className="px-3 py-1.5 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/25 hover:bg-white dark:hover:bg-black/35 transition"
              >
                Restore Defaults
              </button>
              <button
                onClick={savePreferences}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent-2)] text-white font-semibold hover:opacity-90 transition"
              >
                Save Profile
              </button>
            </div>
          </div>

          {saveNote && (
            <div className="mt-4 rounded-lg border border-emerald-300/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs px-3 py-2 inline-flex items-center gap-1">
              <CircleCheckBig size={13} />
              {saveNote}
            </div>
          )}

          <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
            <label className="space-y-1.5">
              <span className="muted">Display Name</span>
              <input
                value={preferences.displayName}
                onChange={(event) => updatePreference("displayName", event.target.value)}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                placeholder="How your identity appears"
              />
            </label>

            <label className="space-y-1.5">
              <span className="muted">Risk Profile</span>
              <select
                value={preferences.riskProfile}
                onChange={(event) =>
                  updatePreference("riskProfile", event.target.value as ProfilePreferences["riskProfile"])
                }
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <option value="defensive">Defensive</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="muted">Experience Tier</span>
              <select
                value={preferences.experienceTier}
                onChange={(event) =>
                  updatePreference(
                    "experienceTier",
                    event.target.value as ProfilePreferences["experienceTier"]
                  )
                }
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <option value="starter">Starter</option>
                <option value="active">Active</option>
                <option value="pro">Pro</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="muted">Primary Strategy</span>
              <select
                value={preferences.strategyFocus}
                onChange={(event) =>
                  updatePreference(
                    "strategyFocus",
                    event.target.value as ProfilePreferences["strategyFocus"]
                  )
                }
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                <option value="trend">Trend Following</option>
                <option value="swing">Swing Rotation</option>
                <option value="value">Value Accumulation</option>
                <option value="event-driven">Event Driven</option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            <p className="text-sm muted">Sector Focus (up to 5)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SECTOR_OPTIONS.map((sector) => {
                const selected = preferences.preferredSectors.includes(sector);
                return (
                  <button
                    key={sector}
                    onClick={() => toggleSector(sector)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      selected
                        ? "bg-[var(--accent-2)] text-white border-transparent"
                        : "border-black/15 dark:border-white/15 bg-white/75 dark:bg-black/25 hover:bg-white dark:hover:bg-black/35"
                    }`}
                  >
                    {sector}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <label className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 px-3 py-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm">
                <BellRing size={15} />
                Daily Pre-Market Digest
              </span>
              <input
                type="checkbox"
                checked={preferences.dailyDigest}
                onChange={(event) => updatePreference("dailyDigest", event.target.checked)}
                className="h-4 w-4 accent-[var(--accent-2)]"
              />
            </label>

            <label className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 px-3 py-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm">
                <Sparkles size={15} />
                AI Workflow Automation
              </span>
              <input
                type="checkbox"
                checked={preferences.aiAutomation}
                onChange={(event) => updatePreference("aiAutomation", event.target.checked)}
                className="h-4 w-4 accent-[var(--accent-2)]"
              />
            </label>

            <label className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 px-3 py-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm">
                <LayoutDashboard size={15} />
                Compact Layout Density
              </span>
              <input
                type="checkbox"
                checked={preferences.compactLayout}
                onChange={(event) => updatePreference("compactLayout", event.target.checked)}
                className="h-4 w-4 accent-[var(--accent-2)]"
              />
            </label>

            <label className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 px-3 py-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm">
                <LockKeyhole size={15} />
                Stealth Session Mode
              </span>
              <input
                type="checkbox"
                checked={preferences.stealthMode}
                onChange={(event) => updatePreference("stealthMode", event.target.checked)}
                className="h-4 w-4 accent-[var(--accent-2)]"
              />
            </label>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 px-3 py-2.5">
            <Clock3 size={15} />
            Digest time
            <input
              type="time"
              value={preferences.digestTime}
              onChange={(event) => updatePreference("digestTime", event.target.value)}
              className="ml-auto rounded-lg border border-black/10 dark:border-white/10 bg-white/85 dark:bg-black/25 px-2 py-1 outline-none"
            />
          </label>
        </div>

        <div className="space-y-5">
          <div className="surface-panel p-5 sm:p-6 fade-up">
            <h3 className="text-lg font-semibold section-title inline-flex items-center gap-2">
              <BriefcaseBusiness size={18} />
              Exposure Radar
            </h3>
            <p className="mt-1 text-sm muted">
              Concentration signal: <span className="font-semibold metric-value">{Math.round(concentration * 100)}%</span>{" "}
              in top holding.
            </p>

            <div className="mt-4 space-y-3">
              {focusSymbols.length ? (
                focusSymbols.map((row) => {
                  const weight = totalShares ? (row.shares / totalShares) * 100 : 0;
                  return (
                    <div key={row.symbol}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{row.symbol}</span>
                        <span className="metric-value muted">{weight.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)]"
                          style={{ width: `${clamp(weight, 1, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm muted">No holdings yet. Add portfolio positions to populate this radar.</p>
              )}
            </div>
          </div>

          <div className="surface-panel p-5 sm:p-6 fade-up">
            <h3 className="text-lg font-semibold section-title inline-flex items-center gap-2">
              <Activity size={18} />
              Activity Timeline
            </h3>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm muted">Hydrating profile intelligence...</p>
              ) : notifications.length ? (
                notifications.slice(0, 6).map((item) => (
                  <div
                    key={item.id || `${item.symbol}-${item.time}-${item.message}`}
                    className="rounded-xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 p-3"
                  >
                    <p className="text-sm font-medium">
                      {item.symbol}: <span className="font-normal">{item.message}</span>
                    </p>
                    <p className="text-xs muted mt-1">{prettyTime(item.time)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm muted">No alerts yet. Timeline will populate as events are generated.</p>
              )}
            </div>
          </div>

          <div className="surface-panel p-5 sm:p-6 fade-up">
            <h3 className="text-lg font-semibold section-title inline-flex items-center gap-2">
              <UserRound size={18} />
              Security Posture
            </h3>
            <div className="mt-3 text-sm space-y-2">
              <p className="rounded-lg border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 px-3 py-2 inline-flex items-center gap-2">
                <ShieldCheck size={14} className="text-[var(--positive)]" />
                Token status: active
              </p>
              <p className="rounded-lg border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/20 px-3 py-2 inline-flex items-center gap-2">
                <Radar size={14} />
                Sync channel: {dataMode === "remote" ? "Remote API primary" : "Local fallback active"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
