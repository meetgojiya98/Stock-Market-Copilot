"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Swords,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  Timer,
  Trophy,
  Users,
  Share2,
  BookOpen,
  Eye,
  ClipboardList,
  Bell,
  CalendarDays,
  GitCompareArrows,
  Newspaper,
  PenLine,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Quest {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  current: number;
  target: number;
  reward: string;
}

interface ReferralStats {
  invited: number;
  joined: number;
  rewardsEarned: number;
}

/* ─── localStorage keys ──────────────────────────────────────────────── */

const QUESTS_KEY = "smc_quests_v1";
const REFERRAL_KEY = "smc_referral_v1";

/* ─── Helpers ────────────────────────────────────────────────────────── */

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function saveJSON<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function dateSeed(): number {
  const d = new Date();
  const day = d.getDay();
  const dateNum = d.getDate();
  return day * 1000 + dateNum * 37 + d.getMonth() * 7;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ─── Quest pool ─────────────────────────────────────────────────────── */

function buildQuestPool(): Quest[] {
  return [
    {
      id: "research-3",
      title: "Research 3 Stocks",
      description: "Look up fundamentals for 3 different stocks",
      icon: <BookOpen size={14} />,
      current: 3,
      target: 3,
      reward: "+50 XP",
    },
    {
      id: "watchlist-5",
      title: "Add 5 to Watchlist",
      description: "Add five new symbols to your watchlist",
      icon: <Eye size={14} />,
      current: 2,
      target: 5,
      reward: "+30 XP",
    },
    {
      id: "review-portfolio",
      title: "Review Portfolio",
      description: "Open and review your current portfolio",
      icon: <ClipboardList size={14} />,
      current: 0,
      target: 1,
      reward: "+20 XP",
    },
    {
      id: "set-alert",
      title: "Set Price Alert",
      description: "Create a price alert for any stock",
      icon: <Bell size={14} />,
      current: 1,
      target: 1,
      reward: "+15 XP",
    },
    {
      id: "earnings-calendar",
      title: "Check Earnings Calendar",
      description: "View the upcoming earnings schedule",
      icon: <CalendarDays size={14} />,
      current: 0,
      target: 1,
      reward: "+15 XP",
    },
    {
      id: "compare-2",
      title: "Compare 2 Stocks",
      description: "Use the comparison tool on two tickers",
      icon: <GitCompareArrows size={14} />,
      current: 1,
      target: 2,
      reward: "+25 XP",
    },
    {
      id: "read-3-news",
      title: "Read 3 News Articles",
      description: "Read three market news articles today",
      icon: <Newspaper size={14} />,
      current: 2,
      target: 3,
      reward: "+20 XP",
    },
    {
      id: "log-trade",
      title: "Log a Trade in Journal",
      description: "Record a trade entry in your journal",
      icon: <PenLine size={14} />,
      current: 0,
      target: 1,
      reward: "+25 XP",
    },
  ];
}

function getDailyQuests(): Quest[] {
  const pool = buildQuestPool();
  const seed = dateSeed();
  const shuffled = seededShuffle(pool, seed);
  /* Pick 6-8 based on day-of-week */
  const count = 6 + (new Date().getDay() % 3);
  return shuffled.slice(0, count);
}

function loadQuests(): Quest[] {
  try {
    const raw = localStorage.getItem(QUESTS_KEY);
    if (raw) {
      const saved: { date: string; quests: Array<{ id: string; current: number }> } =
        JSON.parse(raw);
      if (saved.date === new Date().toISOString().slice(0, 10)) {
        const daily = getDailyQuests();
        return daily.map((q) => {
          const override = saved.quests.find((s) => s.id === q.id);
          if (override) return { ...q, current: override.current };
          return q;
        });
      }
    }
  } catch {
    /* ignore */
  }
  return getDailyQuests();
}

function persistQuests(quests: Quest[]) {
  saveJSON(QUESTS_KEY, {
    date: new Date().toISOString().slice(0, 10),
    quests: quests.map((q) => ({ id: q.id, current: q.current })),
  });
}

/* ─── QuestList ──────────────────────────────────────────────────────── */

export function QuestList() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setQuests(loadQuests());
    setMounted(true);
  }, []);

  const handleProgress = useCallback((id: string) => {
    setQuests((prev) => {
      const next = prev.map((q) => {
        if (q.id !== id) return q;
        return { ...q, current: Math.min(q.current + 1, q.target) };
      });
      persistQuests(next);
      return next;
    });
  }, []);

  const completedCount = useMemo(
    () => quests.filter((q) => q.current >= q.target).length,
    [quests]
  );

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Swords size={15} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            Daily Quests
          </span>
        </div>
        <span style={{ fontSize: "0.68rem", color: "var(--ink-muted)" }}>
          {completedCount}/{quests.length} done
        </span>
      </div>

      {quests.map((q) => {
        const isComplete = q.current >= q.target;
        const pct = Math.min((q.current / q.target) * 100, 100);

        return (
          <div
            key={q.id}
            className={`quest-card ${isComplete ? "quest-complete" : ""}`}
            onClick={() => {
              if (!isComplete) handleProgress(q.id);
            }}
            style={{ cursor: isComplete ? "default" : "pointer" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span
                  style={{
                    color: isComplete ? "var(--positive)" : "var(--ink-muted)",
                    flexShrink: 0,
                  }}
                >
                  {isComplete ? <CheckCircle2 size={14} /> : q.icon}
                </span>
                <span className="quest-title">{q.title}</span>
              </div>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: isComplete ? "var(--positive)" : "var(--ink-muted)",
                }}
              >
                {q.current}/{q.target}
              </span>
            </div>

            <p className="quest-desc">{q.description}</p>

            <div className="quest-progress-bar">
              <div className="quest-progress-fill" style={{ width: `${pct}%` }} />
            </div>

            <div className="quest-reward">
              <Gift size={10} />
              <span>{q.reward}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── TournamentBanner ───────────────────────────────────────────────── */

function getNextTournamentEnd(): Date {
  const now = new Date();
  const end = new Date(now);
  /* Tournament runs until next Sunday 23:59:59 */
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  end.setDate(end.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00:00";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TournamentBanner() {
  const [countdown, setCountdown] = useState("");
  const [mounted, setMounted] = useState(false);
  const tournamentEnd = useMemo(() => getNextTournamentEnd(), []);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const diff = tournamentEnd.getTime() - Date.now();
      setCountdown(formatCountdown(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tournamentEnd]);

  if (!mounted) return null;

  return (
    <div className="tournament-banner">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Trophy size={16} style={{ color: "var(--accent)" }} />
            <span
              style={{
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "var(--ink)",
              }}
            >
              Weekly Paper Trading Championship
            </span>
          </div>
          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--ink-muted)",
              marginTop: "0.15rem",
            }}
          >
            Starting capital: $100,000 | Your rank: #42 of 1,283
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.15rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <Timer size={12} style={{ color: "var(--ink-muted)" }} />
            <span className="tournament-countdown">{countdown}</span>
          </div>
          <span
            style={{
              fontSize: "0.65rem",
              color: "var(--ink-muted)",
            }}
          >
            days : hrs : min : sec
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginTop: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <div className="tournament-prize">
          <Gift size={12} />
          <span>1st: Premium 3-month subscription</span>
        </div>
        <div className="tournament-prize">
          <Trophy size={12} />
          <span>2nd-5th: Exclusive badges</span>
        </div>
      </div>
    </div>
  );
}

/* ─── ReferralTracker ────────────────────────────────────────────────── */

export function ReferralTracker() {
  const [stats, setStats] = useState<ReferralStats>({
    invited: 3,
    joined: 2,
    rewardsEarned: 200,
  });
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const referralCode = "ZENTRADE-" + "A7K2M";
  const referralLink = `https://zentrade.app/join?ref=${referralCode}`;

  useEffect(() => {
    const saved = loadJSON<ReferralStats>(REFERRAL_KEY, {
      invited: 3,
      joined: 2,
      rewardsEarned: 200,
    });
    setStats(saved);
    setMounted(true);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard not available, fallback */
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralLink]);

  if (!mounted) return null;

  return (
    <div className="referral-tracker">
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <Share2 size={15} style={{ color: "var(--accent)" }} />
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          Refer a Friend
        </span>
      </div>

      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--ink-muted)",
        }}
      >
        Share your referral link and earn 100 XP for each friend that joins.
      </p>

      <div className="referral-link">
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
          {referralLink}
        </span>
        <button className="referral-copy-btn" onClick={handleCopy}>
          {copied ? (
            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
              <Check size={10} /> Copied
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
              <Copy size={10} /> Copy
            </span>
          )}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div className="referral-stat">
          <span style={{ color: "var(--ink-muted)" }}>
            <Users size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Invited
          </span>
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>
            {stats.invited}
          </span>
        </div>
        <div className="referral-stat">
          <span style={{ color: "var(--ink-muted)" }}>
            <CheckCircle2 size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Joined
          </span>
          <span style={{ fontWeight: 700, color: "var(--positive)" }}>
            {stats.joined}
          </span>
        </div>
        <div className="referral-stat">
          <span style={{ color: "var(--ink-muted)" }}>
            <Gift size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            XP Earned
          </span>
          <span style={{ fontWeight: 700, color: "var(--accent)" }}>
            {stats.rewardsEarned} XP
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Composed: QuestTracker ─────────────────────────────────────────── */

export default function QuestTracker() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "0.75rem",
        borderRadius: "0.65rem",
        border: "1px solid var(--surface-border)",
        background: "var(--bg-canvas)",
      }}
    >
      {/* Tournament banner at top */}
      <TournamentBanner />

      {/* Divider */}
      <div style={{ height: 1, background: "var(--surface-border)" }} />

      {/* Daily quests */}
      <QuestList />

      {/* Divider */}
      <div style={{ height: 1, background: "var(--surface-border)" }} />

      {/* Referral section */}
      <ReferralTracker />
    </div>
  );
}
