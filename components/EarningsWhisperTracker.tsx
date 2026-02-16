"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Calendar,
  ChevronDown,
  Clock,
  DollarSign,
  Minus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SortKey = "date" | "surprise" | "marketCap";
type SortDir = "asc" | "desc";

interface QuarterResult {
  quarter: string;
  consensus: number;
  actual: number;
  beat: boolean;
}

interface EarningsEntry {
  symbol: string;
  companyName: string;
  earningsDate: Date;
  consensusEPS: number;
  whisperEPS: number;
  marketCap: number; // in billions
  surprisePotential: number; // percentage
  historicalQuarters: QuarterResult[];
  surpriseRate: number; // 0-100
}

/* ------------------------------------------------------------------ */
/*  Deterministic seed helpers                                         */
/* ------------------------------------------------------------------ */

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Mock data generation                                               */
/* ------------------------------------------------------------------ */

const COMPANIES = [
  { symbol: "NVDA", name: "NVIDIA Corporation", cap: 2200 },
  { symbol: "AAPL", name: "Apple Inc.", cap: 2900 },
  { symbol: "MSFT", name: "Microsoft Corporation", cap: 2800 },
  { symbol: "GOOGL", name: "Alphabet Inc.", cap: 1900 },
  { symbol: "AMZN", name: "Amazon.com Inc.", cap: 1800 },
  { symbol: "META", name: "Meta Platforms Inc.", cap: 1200 },
  { symbol: "TSLA", name: "Tesla Inc.", cap: 800 },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", cap: 550 },
  { symbol: "CRM", name: "Salesforce Inc.", cap: 260 },
  { symbol: "NFLX", name: "Netflix Inc.", cap: 290 },
  { symbol: "AMD", name: "Advanced Micro Devices", cap: 230 },
  { symbol: "COST", name: "Costco Wholesale Corp.", cap: 340 },
];

const QUARTERS = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];

function generateEarningsData(): EarningsEntry[] {
  const seed = dateSeed();
  const rand = seededRandom(seed);
  const now = new Date();

  /* Shuffle and pick 8 */
  const shuffled = [...COMPANIES].sort(() => rand() - 0.5);
  const selected = shuffled.slice(0, 8);

  return selected.map((company, idx) => {
    /* Earnings date: spread over next 1-30 days */
    const daysOut = Math.floor(rand() * 28) + 1 + idx * 3;
    const earningsDate = new Date(now.getTime() + daysOut * 86400000);

    /* EPS values */
    const consensusEPS = Math.round((rand() * 4 + 0.5) * 100) / 100;
    const whisperDelta = (rand() * 0.4 - 0.1); /* whisper is usually slightly above */
    const whisperEPS = Math.round((consensusEPS + whisperDelta) * 100) / 100;

    /* Historical quarters */
    const historicalQuarters: QuarterResult[] = QUARTERS.map((q) => {
      const histConsensus = Math.round((rand() * 3 + 0.3) * 100) / 100;
      const beat = rand() > 0.35;
      const actualDelta = beat ? rand() * 0.5 + 0.02 : -(rand() * 0.3 + 0.01);
      return {
        quarter: q,
        consensus: histConsensus,
        actual: Math.round((histConsensus + actualDelta) * 100) / 100,
        beat,
      };
    });

    const beats = historicalQuarters.filter((q) => q.beat).length;
    const surpriseRate = Math.round((beats / historicalQuarters.length) * 100);

    const surprisePotential = Math.round(
      Math.abs(((whisperEPS - consensusEPS) / Math.max(consensusEPS, 0.01)) * 100) * 10
    ) / 10;

    return {
      symbol: company.symbol,
      companyName: company.name,
      earningsDate,
      consensusEPS,
      whisperEPS,
      marketCap: company.cap,
      surprisePotential,
      historicalQuarters,
      surpriseRate,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(d: Date): number {
  const now = new Date();
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86400000));
}

/* ------------------------------------------------------------------ */
/*  Countdown hook                                                     */
/* ------------------------------------------------------------------ */

function useCountdown(target: Date): { days: number; hours: number; minutes: number; seconds: number } {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EarningsWhisperTracker() {
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setEntries(generateEarningsData());
  }, []);

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...entries];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = a.earningsDate.getTime() - b.earningsDate.getTime();
          break;
        case "surprise":
          cmp = a.surprisePotential - b.surprisePotential;
          break;
        case "marketCap":
          cmp = a.marketCap - b.marketCap;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [entries, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(key === "marketCap" ? "desc" : "asc");
      }
    },
    [sortKey],
  );

  /* Top stock for countdown */
  const topStock = sorted[0] || null;
  const countdown = useCountdown(topStock?.earningsDate || new Date());

  if (entries.length === 0) return null;

  return (
    <div style={{ background: "var(--card, #1e1e2f)", borderRadius: 16, padding: 24, color: "var(--foreground, #e2e2e2)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Target size={22} style={{ color: "#60a5fa" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Earnings Whisper Tracker</h3>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Consensus vs whisper estimates for upcoming reports</span>
          </div>
        </div>
      </div>

      {/* Countdown to top stock */}
      {topStock && (
        <div
          className="whisper-countdown"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(56,189,248,0.08))",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Next Earnings Report
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>{topStock.symbol}</span>
              <span style={{ fontSize: 14, opacity: 0.6 }}>{topStock.companyName}</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.45, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} />
              {formatDate(topStock.earningsDate)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "Days", value: countdown.days },
              { label: "Hours", value: countdown.hours },
              { label: "Min", value: countdown.minutes },
              { label: "Sec", value: countdown.seconds },
            ].map((unit) => (
              <div key={unit.label} style={{ textAlign: "center" }}>
                <div
                  className="whisper-countdown-value"
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#60a5fa",
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    minWidth: 48,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(unit.value).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4, textTransform: "uppercase" }}>{unit.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, opacity: 0.5 }}>Sort by:</span>
        {([
          { key: "date" as SortKey, label: "Date" },
          { key: "surprise" as SortKey, label: "Surprise Potential" },
          { key: "marketCap" as SortKey, label: "Market Cap" },
        ]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => toggleSort(opt.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: sortKey === opt.key ? "rgba(59,130,246,0.15)" : "rgba(0,0,0,0.15)",
              border: `1px solid ${sortKey === opt.key ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 8,
              color: sortKey === opt.key ? "#60a5fa" : "rgba(255,255,255,0.5)",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {opt.label}
            {sortKey === opt.key && (
              sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
            )}
          </button>
        ))}
      </div>

      {/* Earnings cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((entry) => {
          const whisperAbove = entry.whisperEPS > entry.consensusEPS;
          const whisperBelow = entry.whisperEPS < entry.consensusEPS;
          const whisperInline = !whisperAbove && !whisperBelow;
          const maxEPS = Math.max(entry.consensusEPS, entry.whisperEPS) * 1.15;
          const consensusPct = maxEPS > 0 ? (entry.consensusEPS / maxEPS) * 100 : 0;
          const whisperPct = maxEPS > 0 ? (entry.whisperEPS / maxEPS) * 100 : 0;
          const days = daysUntil(entry.earningsDate);

          const surpriseBadgeColor = whisperAbove
            ? { bg: "rgba(34,197,94,0.12)", text: "#22c55e", border: "rgba(34,197,94,0.3)" }
            : whisperBelow
            ? { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.3)" }
            : { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" };

          return (
            <div
              key={entry.symbol}
              className="whisper-card"
              style={{
                background: "rgba(0,0,0,0.15)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: 18,
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {/* Top row: symbol, name, date, badges */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#60a5fa" }}>{entry.symbol}</div>
                    <div style={{ fontSize: 12, opacity: 0.5 }}>{entry.companyName}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Surprise badge */}
                  <span
                    className="whisper-surprise-badge"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: surpriseBadgeColor.bg,
                      color: surpriseBadgeColor.text,
                      border: `1px solid ${surpriseBadgeColor.border}`,
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {whisperAbove ? <TrendingUp size={12} /> : whisperBelow ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {whisperAbove ? "Beat Expected" : whisperBelow ? "Miss Risk" : "In-Line"}
                  </span>
                  {/* Days countdown chip */}
                  <span style={{
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 8,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    opacity: 0.7,
                  }}>
                    <Clock size={11} />
                    {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                  </span>
                </div>
              </div>

              {/* Estimate bars */}
              <div className="whisper-estimate-row" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {/* Consensus */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, width: 72, flexShrink: 0 }}>Consensus</span>
                  <div className="whisper-bar-wrap" style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.04)", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                    <div
                      className="whisper-bar-fill"
                      style={{
                        width: `${consensusPct}%`,
                        height: "100%",
                        background: "rgba(148,163,184,0.35)",
                        borderRadius: 6,
                        transition: "width 0.4s ease",
                      }}
                    />
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700 }}>
                      ${entry.consensusEPS.toFixed(2)}
                    </span>
                  </div>
                </div>
                {/* Whisper */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, width: 72, flexShrink: 0, color: whisperAbove ? "#22c55e" : whisperBelow ? "#ef4444" : "#94a3b8" }}>
                    Whisper
                  </span>
                  <div className="whisper-bar-wrap" style={{ flex: 1, height: 22, background: "rgba(255,255,255,0.04)", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                    <div
                      className="whisper-bar-fill"
                      style={{
                        width: `${whisperPct}%`,
                        height: "100%",
                        background: whisperAbove
                          ? "rgba(34,197,94,0.35)"
                          : whisperBelow
                          ? "rgba(239,68,68,0.3)"
                          : "rgba(148,163,184,0.25)",
                        borderRadius: 6,
                        transition: "width 0.4s ease",
                      }}
                    />
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: whisperAbove ? "#22c55e" : whisperBelow ? "#ef4444" : "inherit" }}>
                      ${entry.whisperEPS.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom row: historical quarters + surprise rate + mkt cap */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                {/* Historical quarters */}
                <div>
                  <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Last 4 Quarters
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {entry.historicalQuarters.map((q) => {
                      const color = q.beat ? "#22c55e" : "#ef4444";
                      const diff = q.actual - q.consensus;
                      return (
                        <div
                          key={q.quarter}
                          style={{
                            textAlign: "center",
                            background: q.beat ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                            border: `1px solid ${q.beat ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                            borderRadius: 8,
                            padding: "6px 10px",
                            minWidth: 60,
                          }}
                        >
                          <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2 }}>{q.quarter}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color }}>
                            {diff >= 0 ? "+" : ""}{diff.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.45, marginTop: 1 }}>
                            {q.beat ? "Beat" : "Miss"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right stats */}
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {/* Surprise rate */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, opacity: 0.4, textTransform: "uppercase", marginBottom: 4 }}>Beat Rate</div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: entry.surpriseRate >= 75 ? "#22c55e" : entry.surpriseRate >= 50 ? "#facc15" : "#ef4444",
                    }}>
                      {entry.surpriseRate}%
                    </div>
                  </div>

                  {/* Surprise potential */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, opacity: 0.4, textTransform: "uppercase", marginBottom: 4 }}>Surprise</div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#60a5fa",
                    }}>
                      {entry.surprisePotential}%
                    </div>
                  </div>

                  {/* Market cap */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, opacity: 0.4, textTransform: "uppercase", marginBottom: 4 }}>Mkt Cap</div>
                    <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.65 }}>
                      ${entry.marketCap >= 1000 ? `${(entry.marketCap / 1000).toFixed(1)}T` : `${entry.marketCap}B`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .whisper-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
