"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

/* ────────────────────────────────────────────────────────
 * Shared helpers
 * ──────────────────────────────────────────────────────── */

interface MockUser {
  id: string;
  initials: string;
  name: string;
  color: string;
  online: boolean;
}

const AVATAR_COLORS = [
  "#3b82f6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#60a5fa",
  "#ef4444",
  "#2563eb",
  "#14b8a6",
];

function generateMockUsers(count: number): MockUser[] {
  const names = [
    "Alex Chen",
    "Sam Patel",
    "Riley Brooks",
    "Jordan Lee",
    "Taylor Kim",
    "Casey Wang",
    "Morgan Reed",
    "Quinn Diaz",
  ];
  return names.slice(0, count).map((name, i) => ({
    id: `user-${i}`,
    initials: name
      .split(" ")
      .map((n) => n[0])
      .join(""),
    name,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    online: i < count - 1 || Math.random() > 0.3,
  }));
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SYMBOLS = [
  "AAPL",
  "TSLA",
  "NVDA",
  "GOOGL",
  "AMZN",
  "MSFT",
  "META",
  "NFLX",
  "AMD",
  "SPY",
];

/* ────────────────────────────────────────────────────────
 * 1. PresenceAvatars
 * ──────────────────────────────────────────────────────── */

interface PresenceAvatarsProps {
  maxShow?: number;
}

export function PresenceAvatars({ maxShow = 3 }: PresenceAvatarsProps) {
  const [users, setUsers] = useState<MockUser[]>([]);

  useEffect(() => {
    const count = 5 + Math.floor(Math.random() * 4); // 5-8 users
    setUsers(generateMockUsers(count));
  }, []);

  // Periodically toggle a random user's online state
  useEffect(() => {
    const interval = setInterval(() => {
      setUsers((prev) =>
        prev.map((u, i) =>
          i === Math.floor(Math.random() * prev.length)
            ? { ...u, online: !u.online }
            : u
        )
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const onlineUsers = users.filter((u) => u.online);
  const displayed = onlineUsers.slice(0, maxShow);
  const overflow = onlineUsers.length - maxShow;

  return (
    <div className="presence-indicator" role="group" aria-label="Online users">
      {displayed.map((user) => (
        <div
          key={user.id}
          className="presence-avatar"
          style={{ backgroundColor: user.color, position: "relative" }}
          title={`${user.name} (online)`}
          aria-label={`${user.name} is online`}
        >
          {user.initials}
          <span className="presence-dot" />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="presence-avatar presence-overflow"
          title={`${overflow} more online`}
          aria-label={`${overflow} more users online`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 * 2. ActivityFeed
 * ──────────────────────────────────────────────────────── */

interface ActivityEvent {
  id: string;
  user: MockUser;
  action: string;
  symbol: string;
  timestamp: Date;
}

const ACTION_TEMPLATES = [
  "bought",
  "sold",
  "added %s to watchlist",
  "removed %s from watchlist",
  "set alert on",
  "viewed chart for",
  "shared analysis of",
  "commented on",
  "opened position in",
  "closed position in",
];

function generateEvent(users: MockUser[]): ActivityEvent {
  const user = users[Math.floor(Math.random() * users.length)];
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const template =
    ACTION_TEMPLATES[Math.floor(Math.random() * ACTION_TEMPLATES.length)];
  const action = template.includes("%s")
    ? template.replace("%s", symbol)
    : `${template} ${symbol}`;

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user,
    action,
    symbol,
    timestamp: new Date(),
  };
}

function generateHistoricEvents(users: MockUser[], count: number): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const template =
      ACTION_TEMPLATES[Math.floor(Math.random() * ACTION_TEMPLATES.length)];
    const action = template.includes("%s")
      ? template.replace("%s", symbol)
      : `${template} ${symbol}`;
    events.push({
      id: `evt-hist-${i}`,
      user,
      action,
      symbol,
      timestamp: new Date(now - (count - i) * 45000 - Math.random() * 30000),
    });
  }
  return events;
}

interface ActivityFeedProps {
  maxItems?: number;
}

export function ActivityFeed({ maxItems = 50 }: ActivityFeedProps) {
  const mockUsers = useMemo(() => generateMockUsers(6), []);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const [timeNow, setTimeNow] = useState(Date.now());

  // Generate initial historic events
  useEffect(() => {
    setEvents(generateHistoricEvents(mockUsers, 18));
  }, [mockUsers]);

  // Add a new event every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => {
        const next = [generateEvent(mockUsers), ...prev];
        return next.slice(0, maxItems);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [mockUsers, maxItems]);

  // Refresh relative times every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTimeNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={feedRef}
      className="activity-feed"
      role="log"
      aria-label="Team activity feed"
      aria-live="polite"
      style={{ maxHeight: 360, overflowY: "auto" }}
    >
      {events.map((evt) => (
        <div key={evt.id} className="activity-item">
          <div
            className="activity-avatar-sm"
            style={{ backgroundColor: evt.user.color }}
          >
            {evt.user.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>
              {evt.user.name.split(" ")[0]}
            </span>{" "}
            <span style={{ color: "var(--ink-muted)" }}>{evt.action}</span>
          </div>
          <span className="activity-time" suppressHydrationWarning>
            {relativeTime(evt.timestamp)}
          </span>
        </div>
      ))}
      {events.length === 0 && (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--ink-muted)",
            fontSize: "0.8rem",
          }}
        >
          No activity yet
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 * 3. VersionHistory
 * ──────────────────────────────────────────────────────── */

type VersionType = "add" | "remove" | "edit";

interface VersionEntry {
  id: string;
  user: string;
  action: string;
  type: VersionType;
  timestamp: Date;
}

const VERSION_DOT_COLORS: Record<VersionType, string> = {
  add: "var(--positive)",
  remove: "var(--negative)",
  edit: "#3b82f6",
};

function generateVersionHistory(): VersionEntry[] {
  const users = ["Alex", "Sam", "Riley", "Jordan", "Taylor", "Casey"];
  const actions: { text: string; type: VersionType }[] = [
    { text: "Added AAPL (150 shares)", type: "add" },
    { text: "Removed NFLX from portfolio", type: "remove" },
    { text: "Updated TSLA target price to $280", type: "edit" },
    { text: "Added NVDA (50 shares)", type: "add" },
    { text: "Changed GOOGL allocation to 12%", type: "edit" },
    { text: "Removed AMD from watchlist", type: "remove" },
    { text: "Added MSFT (200 shares)", type: "add" },
    { text: "Updated stop-loss on AMZN", type: "edit" },
    { text: "Added META (75 shares)", type: "add" },
    { text: "Removed SPY hedge position", type: "remove" },
    { text: "Edited AAPL notes", type: "edit" },
    { text: "Added AVGO (30 shares)", type: "add" },
  ];

  const now = Date.now();
  return actions.map((a, i) => ({
    id: `ver-${i}`,
    user: users[i % users.length],
    action: a.text,
    type: a.type,
    timestamp: new Date(now - i * 3600000 - Math.random() * 1800000),
  }));
}

export function VersionHistory() {
  const [entries, setEntries] = useState<VersionEntry[]>([]);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [timeNow, setTimeNow] = useState(Date.now());

  useEffect(() => {
    const saved = localStorage.getItem("zentrade-version-history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as VersionEntry[];
        setEntries(
          parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
        );
        return;
      } catch {
        // fall through to generate fresh
      }
    }
    const fresh = generateVersionHistory();
    setEntries(fresh);
    localStorage.setItem("zentrade-version-history", JSON.stringify(fresh));
  }, []);

  // Refresh relative timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTimeNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRevert = useCallback(
    (id: string) => {
      setRevertingId(id);
      // Simulate revert: remove all entries after the reverted one
      setTimeout(() => {
        const idx = entries.findIndex((e) => e.id === id);
        if (idx >= 0) {
          const reverted = entries.slice(idx);
          setEntries(reverted);
          localStorage.setItem(
            "zentrade-version-history",
            JSON.stringify(reverted)
          );
        }
        setRevertingId(null);
      }, 600);
    },
    [entries]
  );

  return (
    <div role="list" aria-label="Version history">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="version-history-entry"
          role="listitem"
          style={{ alignItems: "flex-start" }}
        >
          <div
            className="version-dot"
            style={{ backgroundColor: VERSION_DOT_COLORS[entry.type] }}
            aria-hidden="true"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.78rem", color: "var(--ink)" }}>
              <span style={{ fontWeight: 600 }}>{entry.user}</span>{" "}
              <span style={{ color: "var(--ink-muted)" }}>{entry.action}</span>
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "var(--ink-muted)",
                marginTop: 2,
              }}
              suppressHydrationWarning
            >
              {relativeTime(entry.timestamp)}
            </div>
          </div>
          <button
            className="version-revert-btn"
            onClick={() => handleRevert(entry.id)}
            disabled={revertingId === entry.id}
            aria-label={`Revert to: ${entry.action}`}
            style={{
              background: "none",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
            }}
          >
            <RotateCcw
              size={11}
              style={{
                animation:
                  revertingId === entry.id ? "spin 0.6s linear" : undefined,
              }}
            />
            Revert
          </button>
        </div>
      ))}
      {entries.length === 0 && (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--ink-muted)",
            fontSize: "0.8rem",
          }}
        >
          No version history
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 * 4. SyncStatus
 * ──────────────────────────────────────────────────────── */

type SyncState = "synced" | "syncing" | "offline";

export function SyncStatus() {
  const [state, setState] = useState<SyncState>("synced");

  useEffect(() => {
    // Cycle: synced (5s) -> syncing (2s) -> synced (8s) -> syncing (2s) -> ...
    // Occasionally show offline
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function cycle() {
      if (cancelled) return;

      // synced for 5-8 seconds
      setState("synced");
      const syncedDuration = 5000 + Math.random() * 3000;

      timer = setTimeout(() => {
        if (cancelled) return;
        setState("syncing");

        // syncing for 1.5-2.5 seconds
        const syncingDuration = 1500 + Math.random() * 1000;
        timer = setTimeout(() => {
          if (cancelled) return;

          // 15% chance of going offline briefly
          if (Math.random() < 0.15) {
            setState("offline");
            timer = setTimeout(() => {
              if (cancelled) return;
              setState("syncing");
              timer = setTimeout(() => {
                if (cancelled) return;
                cycle();
              }, 1800);
            }, 3000);
          } else {
            cycle();
          }
        }, syncingDuration);
      }, syncedDuration);
    }

    cycle();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const icon =
    state === "offline" ? (
      <WifiOff size={13} />
    ) : state === "syncing" ? (
      <RefreshCw
        size={13}
        style={{ animation: "spin 1s linear infinite" }}
      />
    ) : (
      <Wifi size={13} />
    );

  const label =
    state === "synced"
      ? "Synced"
      : state === "syncing"
        ? "Syncing..."
        : "Offline";

  return (
    <span
      className={`sync-status ${state}`}
      role="status"
      aria-label={`Sync status: ${label}`}
    >
      {icon}
      {label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────
 * 5. CollabAnnotation
 * ──────────────────────────────────────────────────────── */

interface Annotation {
  id: string;
  user: MockUser;
  note: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

function generateAnnotations(): Annotation[] {
  const users = generateMockUsers(4);
  const notes = [
    "Key support level here - watch for bounce",
    "Resistance trendline from Jan high",
    "Volume divergence - potential reversal",
    "Earnings gap not yet filled",
  ];
  return users.map((user, i) => ({
    id: `ann-${i}`,
    user,
    note: notes[i],
    x: 15 + i * 22 + Math.random() * 8,
    y: 20 + Math.random() * 55,
  }));
}

interface CollabAnnotationProps {
  children?: ReactNode;
}

export function CollabAnnotation({ children }: CollabAnnotationProps) {
  const [annotations] = useState<Annotation[]>(() => generateAnnotations());
  const [openId, setOpenId] = useState<string | null>(null);

  const handleDotClick = useCallback(
    (id: string) => {
      setOpenId((prev) => (prev === id ? null : id));
    },
    []
  );

  // Close on escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      onClick={(e) => {
        // Close when clicking the container background
        if (e.target === e.currentTarget) setOpenId(null);
      }}
    >
      {children}

      {annotations.map((ann) => (
        <div
          key={ann.id}
          className="collab-annotation"
          style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
        >
          <div
            className="collab-annotation-dot"
            style={{ backgroundColor: ann.user.color }}
            onClick={() => handleDotClick(ann.id)}
            role="button"
            tabIndex={0}
            aria-label={`Annotation by ${ann.user.name}`}
            aria-expanded={openId === ann.id}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleDotClick(ann.id);
              }
            }}
          />

          {openId === ann.id && (
            <div className="collab-annotation-note" role="tooltip">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  marginBottom: "0.25rem",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    backgroundColor: ann.user.color,
                    fontSize: "0.5rem",
                    fontWeight: 700,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {ann.user.initials}
                </div>
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontSize: "0.7rem",
                  }}
                >
                  {ann.user.name}
                </span>
              </div>
              <div style={{ color: "var(--ink-muted)", lineHeight: 1.35 }}>
                {ann.note}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
