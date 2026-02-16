"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Flame,
  Trophy,
  Sparkles,
  Star,
  TrendingUp,
  Search,
  Eye,
  Sunrise,
  Zap,
  ShieldCheck,
  Users,
  BarChart3,
  CircleDollarSign,
  CalendarCheck,
  Crown,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
  current: number;
  target: number;
  unlocked: boolean;
}

interface StreakData {
  count: number;
  lastDate: string;
}

interface XPData {
  total: number;
}

/* ─── localStorage keys ──────────────────────────────────────────────── */

const STREAK_KEY = "smc_streak_v1";
const XP_KEY = "smc_xp_v1";
const ACHIEVEMENTS_KEY = "smc_achievements_v1";

/* ─── Helpers ────────────────────────────────────────────────────────── */

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

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

/* ─── Default Achievements ───────────────────────────────────────────── */

function buildDefaultAchievements(): Achievement[] {
  return [
    {
      id: "first-trade",
      name: "First Trade",
      description: "Execute your very first trade",
      icon: <TrendingUp size={18} />,
      emoji: "\u{1F4B9}",
      current: 1,
      target: 1,
      unlocked: true,
    },
    {
      id: "diversifier",
      name: "Diversifier",
      description: "Invest in 5 different sectors",
      icon: <CircleDollarSign size={18} />,
      emoji: "\u{1F310}",
      current: 3,
      target: 5,
      unlocked: false,
    },
    {
      id: "research-pro",
      name: "Research Pro",
      description: "Run 10 research queries",
      icon: <Search size={18} />,
      emoji: "\u{1F50D}",
      current: 7,
      target: 10,
      unlocked: false,
    },
    {
      id: "watchlist-builder",
      name: "Watchlist Builder",
      description: "Add 10 symbols to watchlists",
      icon: <Eye size={18} />,
      emoji: "\u{1F4CB}",
      current: 10,
      target: 10,
      unlocked: true,
    },
    {
      id: "early-bird",
      name: "Early Bird",
      description: "Login before market open",
      icon: <Sunrise size={18} />,
      emoji: "\u{1F305}",
      current: 0,
      target: 1,
      unlocked: false,
    },
    {
      id: "streak-master",
      name: "Streak Master",
      description: "Maintain a 7-day login streak",
      icon: <Flame size={18} />,
      emoji: "\u{1F525}",
      current: 4,
      target: 7,
      unlocked: false,
    },
    {
      id: "risk-manager",
      name: "Risk Manager",
      description: "Set 5 price alerts",
      icon: <ShieldCheck size={18} />,
      emoji: "\u{1F6E1}\uFE0F",
      current: 5,
      target: 5,
      unlocked: true,
    },
    {
      id: "community-star",
      name: "Community Star",
      description: "Participate in 5 discussions",
      icon: <Users size={18} />,
      emoji: "\u{2B50}",
      current: 2,
      target: 5,
      unlocked: false,
    },
    {
      id: "chart-wizard",
      name: "Chart Wizard",
      description: "Use 3 charting tools",
      icon: <BarChart3 size={18} />,
      emoji: "\u{1F9D9}",
      current: 3,
      target: 3,
      unlocked: true,
    },
    {
      id: "options-explorer",
      name: "Options Explorer",
      description: "View 5 options chains",
      icon: <Zap size={18} />,
      emoji: "\u{1F4A1}",
      current: 1,
      target: 5,
      unlocked: false,
    },
    {
      id: "earnings-tracker",
      name: "Earnings Tracker",
      description: "Track 10 earnings events",
      icon: <CalendarCheck size={18} />,
      emoji: "\u{1F4C5}",
      current: 6,
      target: 10,
      unlocked: false,
    },
    {
      id: "portfolio-master",
      name: "Portfolio Master",
      description: "Build a portfolio of 15+ stocks",
      icon: <Crown size={18} />,
      emoji: "\u{1F451}",
      current: 15,
      target: 15,
      unlocked: true,
    },
  ];
}

function loadAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) {
      const saved: Array<{ id: string; current: number; unlocked: boolean }> =
        JSON.parse(raw);
      const defaults = buildDefaultAchievements();
      return defaults.map((a) => {
        const override = saved.find((s) => s.id === a.id);
        if (override) {
          return {
            ...a,
            current: override.current,
            unlocked: override.unlocked,
          };
        }
        return a;
      });
    }
  } catch {
    /* ignore */
  }
  return buildDefaultAchievements();
}

function persistAchievements(achievements: Achievement[]) {
  const slim = achievements.map((a) => ({
    id: a.id,
    current: a.current,
    unlocked: a.unlocked,
  }));
  saveJSON(ACHIEVEMENTS_KEY, slim);
}

/* ─── AchievementGrid ────────────────────────────────────────────────── */

export function AchievementGrid() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAchievements(loadAchievements());
    setMounted(true);
  }, []);

  const unlockedCount = useMemo(
    () => achievements.filter((a) => a.unlocked).length,
    [achievements]
  );

  const handleProgressIncrement = useCallback(
    (id: string) => {
      setAchievements((prev) => {
        const next = prev.map((a) => {
          if (a.id !== id) return a;
          const newCurrent = Math.min(a.current + 1, a.target);
          return {
            ...a,
            current: newCurrent,
            unlocked: newCurrent >= a.target,
          };
        });
        persistAchievements(next);
        return next;
      });
    },
    []
  );

  if (!mounted) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Trophy size={16} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            Achievements
          </span>
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--ink-muted)",
          }}
        >
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {achievements.map((ach) => (
          <button
            key={ach.id}
            className={`achievement-badge ${ach.unlocked ? "unlocked" : "locked"}`}
            onClick={() => {
              if (!ach.unlocked) handleProgressIncrement(ach.id);
            }}
            title={
              ach.unlocked
                ? `${ach.name} - Unlocked!`
                : `${ach.name} - ${ach.current}/${ach.target}`
            }
            style={{ cursor: ach.unlocked ? "default" : "pointer" }}
          >
            <div
              className="achievement-icon"
              style={{
                background: ach.unlocked
                  ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                  : "color-mix(in srgb, var(--ink) 6%, transparent)",
                color: ach.unlocked ? "var(--accent)" : "var(--ink-muted)",
              }}
            >
              {ach.icon}
            </div>
            <span className="achievement-name">{ach.name}</span>
            <span className="achievement-desc">{ach.description}</span>
            <div className="achievement-progress">
              <div
                className="achievement-progress-fill"
                style={{
                  width: `${Math.min((ach.current / ach.target) * 100, 100)}%`,
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.6rem",
                color: ach.unlocked ? "var(--positive)" : "var(--ink-muted)",
                fontWeight: 600,
              }}
            >
              {ach.unlocked
                ? "Unlocked"
                : `${ach.current}/${ach.target}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── StreakCounter ───────────────────────────────────────────────────── */

export function StreakCounter() {
  const [streak, setStreak] = useState<StreakData>({ count: 0, lastDate: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadJSON<StreakData>(STREAK_KEY, { count: 0, lastDate: "" });
    const today = todayStr();
    const yesterday = yesterdayStr();

    let updatedStreak: StreakData;

    if (saved.lastDate === today) {
      updatedStreak = saved;
    } else if (saved.lastDate === yesterday) {
      updatedStreak = { count: saved.count + 1, lastDate: today };
    } else {
      updatedStreak = { count: 1, lastDate: today };
    }

    saveJSON(STREAK_KEY, updatedStreak);
    setStreak(updatedStreak);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isActive = streak.count > 0;

  return (
    <div className={`streak-counter ${isActive ? "active" : "inactive"}`}>
      <Flame
        size={14}
        className={isActive ? "streak-flame" : ""}
        style={{ flexShrink: 0 }}
      />
      <span>{streak.count} day{streak.count !== 1 ? "s" : ""}</span>
    </div>
  );
}

/* ─── XPBar ──────────────────────────────────────────────────────────── */

const XP_PER_LEVEL = 100;

function getLevel(totalXP: number): number {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

function getXPInCurrentLevel(totalXP: number): number {
  return totalXP % XP_PER_LEVEL;
}

export function XPBar({
  onLevelUp,
}: {
  onLevelUp?: (newLevel: number) => void;
}) {
  const [xpData, setXpData] = useState<XPData>({ total: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadJSON<XPData>(XP_KEY, { total: 0 });
    setXpData(saved);
    setMounted(true);
  }, []);

  const addXP = useCallback(
    (amount: number) => {
      setXpData((prev) => {
        const prevLevel = getLevel(prev.total);
        const next = { total: prev.total + amount };
        const newLevel = getLevel(next.total);
        saveJSON(XP_KEY, next);
        if (newLevel > prevLevel && onLevelUp) {
          onLevelUp(newLevel);
        }
        return next;
      });
    },
    [onLevelUp]
  );

  const level = useMemo(() => getLevel(xpData.total), [xpData.total]);
  const currentXP = useMemo(
    () => getXPInCurrentLevel(xpData.total),
    [xpData.total]
  );
  const progressPercent = (currentXP / XP_PER_LEVEL) * 100;

  if (!mounted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <div className="xp-bar">
        <span className="xp-level">Lv {level}</span>
        <div className="xp-track">
          <div
            className="xp-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="xp-label">
          {currentXP}/{XP_PER_LEVEL} XP
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
        }}
      >
        <span
          style={{
            fontSize: "0.62rem",
            color: "var(--ink-muted)",
          }}
        >
          Total: {xpData.total} XP
        </span>
        <button
          onClick={() => addXP(25)}
          style={{
            fontSize: "0.6rem",
            padding: "0.1rem 0.35rem",
            borderRadius: "0.25rem",
            border: "1px solid var(--surface-border)",
            background: "transparent",
            color: "var(--accent)",
            cursor: "pointer",
            fontWeight: 600,
          }}
          title="Earn 25 XP (demo)"
        >
          +25 XP
        </button>
      </div>
    </div>
  );
}

/* ─── LevelUpPopup ───────────────────────────────────────────────────── */

export function LevelUpPopup({
  level,
  onDismiss,
}: {
  level: number | null;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (level === null) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 2000);
    return () => clearTimeout(timer);
  }, [level, onDismiss]);

  if (!visible || level === null) return null;

  return (
    <div className="level-up-animation">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          padding: "1.5rem 2.5rem",
          borderRadius: "1rem",
          background: "var(--surface-emphasis)",
          border: "2px solid var(--accent)",
          boxShadow: "0 0 40px color-mix(in srgb, var(--accent) 30%, transparent)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <Sparkles
            size={24}
            style={{ color: "var(--accent-2)" }}
          />
          <Sparkles
            size={16}
            style={{ color: "var(--accent)" }}
          />
        </div>
        <span
          style={{
            fontSize: "1.6rem",
            fontWeight: 900,
            color: "var(--accent)",
            letterSpacing: "-0.02em",
          }}
        >
          Level {level}!
        </span>
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--ink-muted)",
          }}
        >
          Keep going, trader!
        </span>
        <div
          style={{
            display: "flex",
            gap: "0.2rem",
            marginTop: "0.15rem",
          }}
        >
          {[Star, Sparkles, Star].map((Icon, i) => (
            <Icon
              key={i}
              size={12}
              style={{
                color: "var(--accent-2)",
                opacity: 0.6 + i * 0.15,
                animation: `flameFlicker ${0.6 + i * 0.2}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Composed: AchievementSystem ────────────────────────────────────── */

export default function AchievementSystem() {
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  const handleLevelUp = useCallback((newLevel: number) => {
    setLevelUpLevel(newLevel);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUpLevel(null);
  }, []);

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
      {/* Header row with streak and XP */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Trophy size={18} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "var(--ink)",
            }}
          >
            Gamification Hub
          </span>
        </div>
        <StreakCounter />
      </div>

      {/* XP Progress */}
      <XPBar onLevelUp={handleLevelUp} />

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "var(--surface-border)",
        }}
      />

      {/* Achievement badges */}
      <AchievementGrid />

      {/* Level up popup (portal at fixed position) */}
      <LevelUpPopup level={levelUpLevel} onDismiss={dismissLevelUp} />
    </div>
  );
}
