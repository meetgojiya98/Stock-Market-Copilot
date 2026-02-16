"use client";

import { useState, useMemo } from "react";
import { Users, TrendingUp, Award, ChevronDown, Activity, Timer, Target, BarChart3, Shield } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Segment = "all" | "risk" | "size";

type MetricDef = {
  label: string;
  key: string;
  icon: React.ReactNode;
  format: (v: number) => string;
  unit: string;
};

type PeerMetric = {
  userValue: number;
  percentile: number;
  peerAvg: number;
  peerTop10: number;
  peerBottom10: number;
};

type LeaderEntry = {
  rank: number;
  name: string;
  ytdReturn: number;
  sharpe: number;
  trades: number;
};

/* ------------------------------------------------------------------ */
/*  Deterministic RNG                                                  */
/* ------------------------------------------------------------------ */

function seededRng(seed: number) {
  let v = seed % 2147483647;
  if (v <= 0) v += 2147483646;
  return () => {
    v = (v * 48271) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Mock Data Generators                                               */
/* ------------------------------------------------------------------ */

const METRICS: MetricDef[] = [
  { label: "YTD Return", key: "ytdReturn", icon: <TrendingUp size={13} />, format: (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%", unit: "%" },
  { label: "Sharpe Ratio", key: "sharpe", icon: <Activity size={13} />, format: (v) => v.toFixed(2), unit: "" },
  { label: "Max Drawdown", key: "maxDrawdown", icon: <Shield size={13} />, format: (v) => v.toFixed(1) + "%", unit: "%" },
  { label: "Win Rate", key: "winRate", icon: <Target size={13} />, format: (v) => v.toFixed(1) + "%", unit: "%" },
  { label: "Avg Hold Time", key: "avgHoldDays", icon: <Timer size={13} />, format: (v) => v.toFixed(0) + "d", unit: " days" },
];

function generatePeerData(segment: Segment): Record<string, PeerMetric> {
  const segSeed = segment === "all" ? 1001 : segment === "risk" ? 2002 : 3003;
  const rng = seededRng(segSeed);

  const result: Record<string, PeerMetric> = {};

  // YTD Return
  const userYTD = segment === "all" ? 18.4 : segment === "risk" ? 21.2 : 16.7;
  const ytdPercentile = segment === "all" ? 67 : segment === "risk" ? 72 : 61;
  result.ytdReturn = {
    userValue: userYTD,
    percentile: ytdPercentile,
    peerAvg: +(5.2 + rng() * 8).toFixed(1),
    peerTop10: +(35 + rng() * 15).toFixed(1),
    peerBottom10: +(-12 - rng() * 10).toFixed(1),
  };

  // Sharpe Ratio
  const userSharpe = segment === "all" ? 1.34 : segment === "risk" ? 1.52 : 1.21;
  const sharpePercentile = segment === "all" ? 71 : segment === "risk" ? 78 : 64;
  result.sharpe = {
    userValue: userSharpe,
    percentile: sharpePercentile,
    peerAvg: +(0.6 + rng() * 0.4).toFixed(2),
    peerTop10: +(1.8 + rng() * 0.5).toFixed(2),
    peerBottom10: +(-0.2 + rng() * 0.3).toFixed(2),
  };

  // Max Drawdown (lower is better, but percentile still means user is better)
  const userDD = segment === "all" ? -8.3 : segment === "risk" ? -6.1 : -10.5;
  const ddPercentile = segment === "all" ? 74 : segment === "risk" ? 82 : 58;
  result.maxDrawdown = {
    userValue: userDD,
    percentile: ddPercentile,
    peerAvg: +(-15.2 - rng() * 5).toFixed(1),
    peerTop10: +(-3.5 - rng() * 2).toFixed(1),
    peerBottom10: +(-28 - rng() * 8).toFixed(1),
  };

  // Win Rate
  const userWR = segment === "all" ? 62.3 : segment === "risk" ? 58.7 : 65.1;
  const wrPercentile = segment === "all" ? 63 : segment === "risk" ? 55 : 70;
  result.winRate = {
    userValue: userWR,
    percentile: wrPercentile,
    peerAvg: +(48 + rng() * 8).toFixed(1),
    peerTop10: +(72 + rng() * 5).toFixed(1),
    peerBottom10: +(32 + rng() * 6).toFixed(1),
  };

  // Average Hold Time
  const userHold = segment === "all" ? 14 : segment === "risk" ? 8 : 22;
  const holdPercentile = segment === "all" ? 55 : segment === "risk" ? 40 : 68;
  result.avgHoldDays = {
    userValue: userHold,
    percentile: holdPercentile,
    peerAvg: +(12 + rng() * 8).toFixed(0),
    peerTop10: +(3 + rng() * 4).toFixed(0),
    peerBottom10: +(35 + rng() * 20).toFixed(0),
  };

  return result;
}

function generateLeaderboard(): LeaderEntry[] {
  const rng = seededRng(7777);
  const names = [
    "Trader_8271",
    "Trader_4059",
    "Trader_6312",
    "Trader_1887",
    "Trader_9204",
  ];
  return names.map((name, i) => ({
    rank: i + 1,
    name,
    ytdReturn: +(45 - i * 6 + rng() * 4).toFixed(1),
    sharpe: +(2.4 - i * 0.25 + rng() * 0.2).toFixed(2),
    trades: Math.floor(80 + rng() * 120),
  }));
}

const SEGMENT_LABELS: Record<Segment, string> = {
  all: "All Users",
  risk: "Same Risk Profile",
  size: "Similar Portfolio Size",
};

const RANK_MEDALS = ["", "", ""];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PeerBenchmark() {
  const [segment, setSegment] = useState<Segment>("all");
  const [segmentOpen, setSegmentOpen] = useState(false);

  const peerData = useMemo(() => generatePeerData(segment), [segment]);
  const leaderboard = useMemo(() => generateLeaderboard(), []);

  // Compute overall percentile (average across metrics)
  const overallPercentile = useMemo(() => {
    const values = Object.values(peerData);
    const sum = values.reduce((acc, v) => acc + v.percentile, 0);
    return Math.round(sum / values.length);
  }, [peerData]);

  return (
    <div className="space-y-4">
      {/* Hero Card - Overall Percentile */}
      <div className="benchmark-card surface-glass">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} style={{ color: "var(--accent)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
                Peer Benchmark
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="benchmark-percentile" style={{ color: "var(--accent)" }}>
                {overallPercentile}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                th percentile
              </span>
            </div>
            <p className="text-[0.72rem] mt-1" style={{ color: "var(--ink-muted)" }}>
              You outperform {overallPercentile}% of {segment === "all" ? "all 1,000" : segment === "risk" ? "342 similar-risk" : "287 similar-size"} users.
            </p>
          </div>

          {/* Segment Selector */}
          <div className="relative">
            <button
              onClick={() => setSegmentOpen((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
              }}
            >
              {SEGMENT_LABELS[segment]}
              <ChevronDown size={13} />
            </button>
            {segmentOpen && (
              <div
                className="absolute right-0 mt-1 z-50 rounded-lg border shadow-lg py-1 min-w-[170px]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                {(Object.keys(SEGMENT_LABELS) as Segment[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSegment(s);
                      setSegmentOpen(false);
                    }}
                    className="w-full text-left text-xs px-3 py-1.5 hover:opacity-80"
                    style={{
                      color: s === segment ? "var(--accent)" : "var(--ink)",
                      fontWeight: s === segment ? 600 : 400,
                    }}
                  >
                    {SEGMENT_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overall Rank Bar */}
        <div className="benchmark-rank-bar">
          <div className="benchmark-rank-fill" style={{ width: `${overallPercentile}%` }} />
          <div
            className="benchmark-rank-marker"
            style={{ left: `calc(${overallPercentile}% - 7px)` }}
          />
        </div>
        <div className="flex justify-between text-[0.65rem] mt-1" style={{ color: "var(--ink-muted)" }}>
          <span>0th</span>
          <span>50th</span>
          <span>100th</span>
        </div>
      </div>

      {/* Per-Metric Breakdown */}
      <div className="benchmark-card surface-glass">
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
          <BarChart3 size={14} style={{ color: "var(--accent)" }} />
          Metric Breakdown
        </h3>

        <div className="space-y-1">
          {METRICS.map((metric) => {
            const data = peerData[metric.key];
            if (!data) return null;

            return (
              <div key={metric.key}>
                <div className="benchmark-comparison-row">
                  <div className="flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
                    <span style={{ color: "var(--accent)" }}>{metric.icon}</span>
                    <span className="font-medium">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>
                      {metric.format(data.userValue)}
                    </span>
                    <span
                      className="text-[0.68rem] px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          data.percentile >= 60
                            ? "color-mix(in srgb, var(--positive) 12%, transparent)"
                            : data.percentile >= 40
                            ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                            : "color-mix(in srgb, var(--negative) 12%, transparent)",
                        color:
                          data.percentile >= 60
                            ? "var(--positive)"
                            : data.percentile >= 40
                            ? "var(--accent)"
                            : "var(--negative)",
                        fontWeight: 600,
                      }}
                    >
                      P{data.percentile}
                    </span>
                  </div>
                </div>

                {/* Mini rank bar per metric */}
                <div className="px-0 py-1">
                  <div className="benchmark-rank-bar" style={{ height: 5 }}>
                    <div
                      className="benchmark-rank-fill"
                      style={{ width: `${data.percentile}%`, height: 5, borderRadius: 2.5 }}
                    />
                    <div
                      className="benchmark-rank-marker"
                      style={{
                        left: `calc(${data.percentile}% - 5px)`,
                        width: 10,
                        height: 10,
                        top: -2.5,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[0.6rem] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                    <span>Bottom 10%: {metric.format(data.peerBottom10)}</span>
                    <span>Avg: {metric.format(data.peerAvg)}</span>
                    <span>Top 10%: {metric.format(data.peerTop10)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performers Leaderboard */}
      <div className="benchmark-card surface-glass">
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
          <Award size={14} style={{ color: "var(--accent)" }} />
          Top Performers This Month
        </h3>

        <div className="space-y-0">
          {leaderboard.map((entry) => (
            <div key={entry.rank} className="benchmark-comparison-row">
              <div className="flex items-center gap-2">
                <span
                  className="text-[0.7rem] font-bold w-5 text-center"
                  style={{
                    color:
                      entry.rank === 1
                        ? "#D4A017"
                        : entry.rank === 2
                        ? "#8B8B8B"
                        : entry.rank === 3
                        ? "#B87333"
                        : "var(--ink-muted)",
                  }}
                >
                  {entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : `#${entry.rank}`}
                </span>
                <span className="text-xs font-medium" style={{ color: "var(--ink)" }}>
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="text-xs font-semibold"
                  style={{ color: entry.ytdReturn >= 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {entry.ytdReturn >= 0 ? "+" : ""}
                  {entry.ytdReturn}%
                </span>
                <span className="text-[0.68rem]" style={{ color: "var(--ink-muted)" }}>
                  Sharpe {entry.sharpe}
                </span>
                <span className="text-[0.68rem]" style={{ color: "var(--ink-muted)" }}>
                  {entry.trades} trades
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
