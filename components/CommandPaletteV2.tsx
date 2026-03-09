"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  Bitcoin,
  BookOpen,
  Briefcase,
  Calculator,
  Calendar,
  Clock,
  Command,
  Copy,
  Cpu,
  FileText,
  Globe,
  Hash,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Link,
  ListOrdered,
  MessageSquare,
  Moon,
  Newspaper,
  PieChart,
  Play,
  Rss,
  Search,
  Settings,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ResultCategory = "pages" | "actions" | "symbols" | "calculator" | "recent";

interface PaletteItem {
  id: string;
  label: string;
  category: ResultCategory;
  /** sub-label shown in lighter text */
  hint?: string;
  /** route to navigate to (pages / symbols) */
  route?: string;
  /** callback for actions */
  action?: () => void;
  /** keywords for fuzzy matching */
  keywords: string[];
  icon: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const RECENT_KEY = "smc_cmd_recent_v1";
const MAX_RECENT = 5;

const PAGE_ENTRIES: PaletteItem[] = [
  /* ── Core ── */
  { id: "p-dashboard", label: "Dashboard", route: "/dashboard", keywords: ["home", "overview", "main"], icon: <LayoutDashboard size={16} />, category: "pages" },
  { id: "p-agents", label: "AI Agents", route: "/agents", keywords: ["agent", "bot", "ai", "deploy"], icon: <Cpu size={16} />, category: "pages" },
  { id: "p-research", label: "Research", route: "/research", keywords: ["research", "report", "analysis"], icon: <FileText size={16} />, category: "pages" },
  { id: "p-portfolio", label: "Portfolio", route: "/portfolio", keywords: ["holdings", "stocks", "positions"], icon: <Briefcase size={16} />, category: "pages" },
  { id: "p-terminal", label: "Terminal", route: "/terminal", keywords: ["chat", "terminal", "command", "ask"], icon: <Zap size={16} />, category: "pages" },
  { id: "p-watchlist", label: "Watchlist", route: "/watchlist", keywords: ["watch", "track", "follow"], icon: <ListOrdered size={16} />, category: "pages" },
  /* ── Market Data ── */
  { id: "p-heatmap", label: "Market Heatmap", route: "/heatmap", keywords: ["heat", "map", "sector"], icon: <PieChart size={16} />, category: "pages" },
  { id: "p-sentiment", label: "Market Sentiment", route: "/sentiment", keywords: ["sentiment", "mood", "fear", "greed", "gauge"], icon: <Zap size={16} />, category: "pages" },
  { id: "p-compare", label: "Compare Stocks", route: "/compare", keywords: ["compare", "versus", "vs", "side by side"], icon: <LineChart size={16} />, category: "pages" },
  { id: "p-options", label: "Options Chain", route: "/options", keywords: ["options", "calls", "puts", "derivatives"], icon: <LineChart size={16} />, category: "pages" },
  { id: "p-insiders", label: "Insider Trading", route: "/insiders", keywords: ["insider", "buy", "sell", "executive"], icon: <Users size={16} />, category: "pages" },
  /* ── Calendars ── */
  { id: "p-earnings", label: "Earnings Calendar", route: "/earnings", keywords: ["earnings", "calendar", "dates", "schedule"], icon: <Calendar size={16} />, category: "pages" },
  { id: "p-economic", label: "Economic Calendar", route: "/economic-calendar", keywords: ["economic", "fed", "cpi", "jobs", "gdp", "fomc"], icon: <Globe size={16} />, category: "pages" },
  /* ── Agent Tools ── */
  { id: "p-workflows", label: "Agent Workflows", route: "/workflows", keywords: ["workflow", "chain", "pipeline", "automate"], icon: <Play size={16} />, category: "pages" },
  { id: "p-builder", label: "Agent Builder", route: "/agents/builder", keywords: ["build", "create", "custom", "agent"], icon: <Settings size={16} />, category: "pages" },
  { id: "p-templates", label: "Agent Templates", route: "/templates", keywords: ["template", "marketplace", "preset"], icon: <BookOpen size={16} />, category: "pages" },
  { id: "p-leaderboard", label: "Agent Leaderboard", route: "/leaderboard", keywords: ["leaderboard", "accuracy", "rank", "best"], icon: <Target size={16} />, category: "pages" },
  /* ── Trading ── */
  { id: "p-journal", label: "Trade Journal", route: "/journal", keywords: ["journal", "log", "diary", "notes", "trade"], icon: <FileText size={16} />, category: "pages" },
  { id: "p-backtest", label: "Backtesting", route: "/backtest", keywords: ["backtest", "historical", "strategy", "test"], icon: <BarChart3 size={16} />, category: "pages" },
  { id: "p-alerts", label: "Price Alerts", route: "/alerts", keywords: ["alert", "notify", "price", "trigger"], icon: <Bell size={16} />, category: "pages" },
  { id: "p-paper", label: "Paper Trading", route: "/paper-trading", keywords: ["paper", "simulate", "practice", "virtual"], icon: <Play size={16} />, category: "pages" },
  /* ── Analytics ── */
  { id: "p-performance", label: "Performance Chart", route: "/performance", keywords: ["performance", "returns", "pnl", "chart", "cagr"], icon: <TrendingUp size={16} />, category: "pages" },
  { id: "p-correlation", label: "Correlation Matrix", route: "/correlation", keywords: ["correlation", "matrix", "diversification"], icon: <PieChart size={16} />, category: "pages" },
  { id: "p-sectors", label: "Sector Rotation", route: "/sectors", keywords: ["sector", "rotation", "gics", "treemap"], icon: <BarChart3 size={16} />, category: "pages" },
  { id: "p-drawdown", label: "Drawdown Analyzer", route: "/drawdown", keywords: ["drawdown", "risk", "loss", "recovery"], icon: <TrendingDown size={16} />, category: "pages" },
  /* ── AI ── */
  { id: "p-chains", label: "Agent Chains", route: "/chains", keywords: ["chain", "pipeline", "sequence", "multi-agent"], icon: <Link size={16} />, category: "pages" },
  { id: "p-nl-alerts", label: "Natural Language Alerts", route: "/nl-alerts", keywords: ["natural", "language", "alert", "plain", "english"], icon: <MessageSquare size={16} />, category: "pages" },
  { id: "p-replay", label: "AI Trade Replay", route: "/replay", keywords: ["replay", "backtest", "historical", "ai", "simulate"], icon: <Play size={16} />, category: "pages" },
  /* ── Social ── */
  { id: "p-profiles", label: "Agent Profiles", route: "/profiles", keywords: ["profile", "share", "public", "community"], icon: <Users size={16} />, category: "pages" },
  { id: "p-signals", label: "Signal Feed", route: "/signals", keywords: ["signal", "feed", "community", "social"], icon: <Rss size={16} />, category: "pages" },
  { id: "p-copy", label: "Copy Trading", route: "/copy-trading", keywords: ["copy", "follow", "trader", "mirror"], icon: <Copy size={16} />, category: "pages" },
  /* ── Data ── */
  { id: "p-portfolios", label: "Multi-Portfolio", route: "/portfolios", keywords: ["portfolio", "multi", "retirement", "accounts"], icon: <Wallet size={16} />, category: "pages" },
  { id: "p-crypto", label: "Crypto Market", route: "/crypto", keywords: ["crypto", "bitcoin", "ethereum", "btc", "eth"], icon: <Bitcoin size={16} />, category: "pages" },
  { id: "p-webhooks", label: "Webhook Alerts", route: "/webhooks", keywords: ["webhook", "discord", "slack", "notify"], icon: <Globe size={16} />, category: "pages" },
  /* ── Other ── */
  { id: "p-settings", label: "Settings", route: "/settings", keywords: ["settings", "theme", "customize", "preferences"], icon: <Settings size={16} />, category: "pages" },
  { id: "p-pricing", label: "Pricing", route: "/pricing", keywords: ["pricing", "plan", "pro", "subscribe"], icon: <Wallet size={16} />, category: "pages" },
  { id: "p-login", label: "Login", route: "/login", keywords: ["login", "signin", "auth"], icon: <Settings size={16} />, category: "pages" },
];

const SYMBOL_ENTRIES: PaletteItem[] = [
  { id: "s-AAPL", label: "AAPL", hint: "Apple Inc.", route: "/dashboard?symbol=AAPL", keywords: ["apple", "aapl", "tech"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-MSFT", label: "MSFT", hint: "Microsoft Corp.", route: "/dashboard?symbol=MSFT", keywords: ["microsoft", "msft", "tech"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-GOOGL", label: "GOOGL", hint: "Alphabet Inc.", route: "/dashboard?symbol=GOOGL", keywords: ["google", "alphabet", "googl"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-AMZN", label: "AMZN", hint: "Amazon.com Inc.", route: "/dashboard?symbol=AMZN", keywords: ["amazon", "amzn", "ecommerce"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-TSLA", label: "TSLA", hint: "Tesla Inc.", route: "/dashboard?symbol=TSLA", keywords: ["tesla", "tsla", "ev", "car"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-META", label: "META", hint: "Meta Platforms", route: "/dashboard?symbol=META", keywords: ["meta", "facebook", "fb", "social"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-NVDA", label: "NVDA", hint: "NVIDIA Corp.", route: "/dashboard?symbol=NVDA", keywords: ["nvidia", "nvda", "gpu", "ai"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-JPM", label: "JPM", hint: "JPMorgan Chase", route: "/dashboard?symbol=JPM", keywords: ["jpmorgan", "jpm", "bank"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-V", label: "V", hint: "Visa Inc.", route: "/dashboard?symbol=V", keywords: ["visa", "payment", "fintech"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-JNJ", label: "JNJ", hint: "Johnson & Johnson", route: "/dashboard?symbol=JNJ", keywords: ["johnson", "jnj", "pharma", "health"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-WMT", label: "WMT", hint: "Walmart Inc.", route: "/dashboard?symbol=WMT", keywords: ["walmart", "wmt", "retail"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-DIS", label: "DIS", hint: "Walt Disney Co.", route: "/dashboard?symbol=DIS", keywords: ["disney", "dis", "media", "entertainment"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-NFLX", label: "NFLX", hint: "Netflix Inc.", route: "/dashboard?symbol=NFLX", keywords: ["netflix", "nflx", "streaming"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-AMD", label: "AMD", hint: "Advanced Micro Devices", route: "/dashboard?symbol=AMD", keywords: ["amd", "chip", "semiconductor"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-INTC", label: "INTC", hint: "Intel Corp.", route: "/dashboard?symbol=INTC", keywords: ["intel", "intc", "chip", "processor"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-BA", label: "BA", hint: "Boeing Co.", route: "/dashboard?symbol=BA", keywords: ["boeing", "ba", "aerospace", "defense"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-CRM", label: "CRM", hint: "Salesforce Inc.", route: "/dashboard?symbol=CRM", keywords: ["salesforce", "crm", "cloud", "saas"], icon: <TrendingUp size={16} />, category: "symbols" },
  { id: "s-PYPL", label: "PYPL", hint: "PayPal Holdings", route: "/dashboard?symbol=PYPL", keywords: ["paypal", "pypl", "payment", "fintech"], icon: <TrendingUp size={16} />, category: "symbols" },
];

/* ------------------------------------------------------------------ */
/*  Fuzzy match helper                                                 */
/* ------------------------------------------------------------------ */

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function matchesItem(query: string, item: PaletteItem): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  if (fuzzyMatch(q, item.label)) return true;
  if (item.hint && fuzzyMatch(q, item.hint)) return true;
  return item.keywords.some((kw) => fuzzyMatch(q, kw));
}

/* ------------------------------------------------------------------ */
/*  Math expression evaluator                                          */
/* ------------------------------------------------------------------ */

function tryEvalMath(expr: string): number | null {
  const cleaned = expr.replace(/\s/g, "");
  if (!/^[\d+\-*/().%^]+$/.test(cleaned)) return null;
  if (!/\d/.test(cleaned)) return null;
  try {
    const safe = cleaned.replace(/\^/g, "**");
    const result = new Function(`"use strict"; return (${safe})`)() as number;
    if (typeof result !== "number" || !isFinite(result)) return null;
    return Math.round(result * 1e6) / 1e6;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers – localStorage                                             */
/* ------------------------------------------------------------------ */

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENT);
    return [];
  } catch {
    return [];
  }
}

function saveRecent(items: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Category labels                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<ResultCategory, string> = {
  recent: "Recent Searches",
  pages: "Pages",
  actions: "Actions",
  symbols: "Symbols",
  calculator: "Calculator",
};

const CATEGORY_ORDER: ResultCategory[] = ["recent", "calculator", "pages", "actions", "symbols"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CommandPaletteV2() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ---------- actions (built dynamically so they capture current state) ---------- */

  const actionEntries: PaletteItem[] = useMemo(
    () => [
      {
        id: "a-dark",
        label: "Toggle Dark Mode",
        category: "actions" as ResultCategory,
        keywords: ["dark", "light", "theme", "mode", "toggle"],
        icon: <Moon size={16} />,
        action: () => {
          document.documentElement.classList.toggle("dark");
        },
      },
      {
        id: "a-light",
        label: "Switch to Light Mode",
        category: "actions" as ResultCategory,
        keywords: ["light", "theme", "bright", "day"],
        icon: <Sun size={16} />,
        action: () => {
          document.documentElement.classList.remove("dark");
        },
      },
      {
        id: "a-cache",
        label: "Clear Cache",
        category: "actions" as ResultCategory,
        keywords: ["clear", "cache", "reset", "storage"],
        icon: <Trash2 size={16} />,
        action: () => {
          localStorage.clear();
          window.location.reload();
        },
      },
      {
        id: "a-export",
        label: "Export Data",
        category: "actions" as ResultCategory,
        keywords: ["export", "download", "csv", "json"],
        icon: <Upload size={16} />,
        action: () => {
          router.push("/export");
        },
      },
      {
        id: "a-refresh",
        label: "Refresh Prices",
        category: "actions" as ResultCategory,
        keywords: ["refresh", "reload", "update", "prices"],
        icon: <Zap size={16} />,
        action: () => {
          window.location.reload();
        },
      },
    ],
    [router]
  );

  const allStatic = useMemo(
    () => [...PAGE_ENTRIES, ...actionEntries, ...SYMBOL_ENTRIES],
    [actionEntries]
  );

  /* ---------- load recent on mount ---------- */

  useEffect(() => {
    setRecentIds(loadRecent());
  }, []);

  /* ---------- keyboard open / close ---------- */

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelectedIdx(0);
          }
          return !prev;
        });
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /* ---------- auto-focus input ---------- */

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* ---------- build results ---------- */

  const results = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];
    const trimmed = query.trim();

    /* calculator */
    const mathResult = tryEvalMath(trimmed);
    if (mathResult !== null) {
      items.push({
        id: "calc-result",
        label: `${trimmed} = ${mathResult}`,
        category: "calculator",
        keywords: [],
        icon: <Calculator size={16} />,
      });
    }

    if (!trimmed) {
      /* show recent when empty */
      const recentItems = recentIds
        .map((rid) => allStatic.find((s) => s.id === rid))
        .filter(Boolean) as PaletteItem[];
      recentItems.forEach((r) => items.push({ ...r, category: "recent" }));
      return items;
    }

    /* fuzzy match across all static entries */
    const matched = allStatic.filter((item) => matchesItem(trimmed, item));

    /* group by category in order */
    const grouped: Record<ResultCategory, PaletteItem[]> = {
      recent: [],
      calculator: [],
      pages: [],
      actions: [],
      symbols: [],
    };
    for (const m of matched) {
      grouped[m.category].push(m);
    }

    for (const cat of CATEGORY_ORDER) {
      if (cat === "calculator") continue; /* already added */
      items.push(...grouped[cat]);
    }

    return items;
  }, [query, allStatic, recentIds]);

  /* ---------- clamp selection ---------- */

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  /* ---------- scroll selected into view ---------- */

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const selected = container.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx]);

  /* ---------- execute item ---------- */

  const executeItem = useCallback(
    (item: PaletteItem) => {
      /* save to recent */
      const realId = item.category === "recent" ? item.id : item.id;
      const updated = [realId, ...recentIds.filter((r) => r !== realId)].slice(0, MAX_RECENT);
      setRecentIds(updated);
      saveRecent(updated);

      setOpen(false);

      if (item.action) {
        item.action();
        return;
      }
      if (item.route) {
        router.push(item.route);
        return;
      }
    },
    [recentIds, router]
  );

  /* ---------- keyboard nav inside list ---------- */

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIdx]) {
          executeItem(results[selectedIdx]);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [results, selectedIdx, executeItem]
  );

  /* ---------- build grouped render list ---------- */

  type RenderRow = { type: "label"; text: string } | { type: "item"; item: PaletteItem; flatIdx: number };

  const renderRows = useMemo<RenderRow[]>(() => {
    const rows: RenderRow[] = [];
    let lastCat: ResultCategory | null = null;
    let idx = 0;
    for (const item of results) {
      if (item.category !== lastCat) {
        lastCat = item.category;
        rows.push({ type: "label", text: CATEGORY_LABELS[item.category] });
      }
      rows.push({ type: "item", item, flatIdx: idx });
      idx++;
    }
    return rows;
  }, [results]);

  /* ---------- don't render when closed ---------- */

  if (!open) return null;

  return (
    <div className="cmdv2-overlay" onClick={() => setOpen(false)}>
      <div
        className="cmdv2-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(580px, 92vw)",
          maxHeight: "520px",
          background: "var(--surface-strong, #1e1e2e)",
          border: "1px solid var(--surface-border, #333)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,.45)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 9999,
          color: "var(--ink, #e0e0e0)",
          fontFamily: "inherit",
        }}
      >
        {/* input */}
        <div
          className="cmdv2-input-wrap"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderBottom: "1px solid var(--surface-border, #333)",
          }}
        >
          <Search size={18} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="cmdv2-input"
            type="text"
            placeholder="Search pages, symbols, actions, or type a math expression..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "inherit",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                opacity: 0.5,
                padding: 2,
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* results */}
        <div
          ref={listRef}
          className="cmdv2-results"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {renderRows.length === 0 && query.trim() && (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                opacity: 0.45,
                fontSize: 14,
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {renderRows.map((row, ri) => {
            if (row.type === "label") {
              return (
                <div
                  key={`label-${ri}`}
                  className="cmdv2-group-label"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    opacity: 0.45,
                    padding: "10px 18px 4px",
                  }}
                >
                  {row.text}
                </div>
              );
            }

            const { item, flatIdx } = row;
            const isSelected = flatIdx === selectedIdx;
            const isCalc = item.category === "calculator";

            return (
              <div
                key={item.id + "-" + flatIdx}
                data-idx={flatIdx}
                className={`cmdv2-item${isSelected ? " cmdv2-item--selected" : ""}`}
                onClick={() => executeItem(item)}
                onMouseEnter={() => setSelectedIdx(flatIdx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 18px",
                  cursor: "pointer",
                  borderRadius: 8,
                  margin: "0 6px",
                  background: isSelected ? "var(--accent, #7c3aed)" : "transparent",
                  color: isSelected ? "#fff" : "inherit",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                <span className="cmdv2-item-icon" style={{ opacity: isSelected ? 1 : 0.55, flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span
                    className={isCalc ? "cmdv2-calc-result" : ""}
                    style={{
                      fontSize: 14,
                      fontWeight: isCalc ? 600 : 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.label}
                  </span>
                  {item.hint && (
                    <span
                      style={{
                        fontSize: 12,
                        opacity: 0.5,
                        marginTop: 1,
                      }}
                    >
                      {item.hint}
                    </span>
                  )}
                </span>
                {item.route && (
                  <ArrowRight size={14} style={{ opacity: 0.35, flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div
          className="cmdv2-footer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 18px",
            borderTop: "1px solid var(--surface-border, #333)",
            fontSize: 12,
            opacity: 0.45,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd className="cmdv2-kbd" style={kbdStyle}>
              <ArrowUp size={10} />
            </kbd>
            <kbd className="cmdv2-kbd" style={kbdStyle}>
              <ArrowDown size={10} />
            </kbd>
            <span>Navigate</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd className="cmdv2-kbd" style={kbdStyle}>Enter</kbd>
            <span>Open</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd className="cmdv2-kbd" style={kbdStyle}>Esc</kbd>
            <span>Close</span>
          </span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <Command size={12} />
            <span>K to toggle</span>
          </span>
        </div>
      </div>

      {/* overlay background styles */}
      <style>{`
        .cmdv2-overlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          animation: cmdv2FadeIn 0.15s ease;
        }
        @keyframes cmdv2FadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .cmdv2-panel {
          animation: cmdv2SlideIn 0.18s ease;
        }
        @keyframes cmdv2SlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .cmdv2-results::-webkit-scrollbar {
          width: 6px;
        }
        .cmdv2-results::-webkit-scrollbar-track {
          background: transparent;
        }
        .cmdv2-results::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        .cmdv2-input::placeholder {
          color: inherit;
          opacity: 0.35;
        }
      `}</style>
    </div>
  );
}

/* ---------- small style constant ---------- */

const kbdStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 20,
  padding: "0 5px",
  borderRadius: 4,
  border: "1px solid var(--surface-border, #444)",
  fontSize: 10,
  fontFamily: "inherit",
  lineHeight: 1,
  background: "rgba(255,255,255,0.06)",
};
