"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BriefcaseBusiness,
  Eye,
  Bot,
  Target,
  LineChart,
  Bell,
  UserRound,
  GitCompare,
  DollarSign,
  Flame,
  Dice5,
  Flag,
  BookOpen,
  Calendar,
  BarChart3,
  SlidersHorizontal,
  MessageCircle,
  Lightbulb,
  Newspaper,
  Users,
  GraduationCap,
  Zap,
  LayoutDashboard,
  Download,
  TrendingUp,
  ClipboardList,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from "lucide-react";

type NavItem = {
  name: string;
  path: string;
  icon: typeof Search;
  description: string;
  group: "Pages" | "Tools" | "Education";
};

const ITEMS: NavItem[] = [
  { name: "Portfolio", path: "/portfolio", icon: BriefcaseBusiness, description: "View and manage your holdings", group: "Pages" },
  { name: "Watchlist", path: "/watchlist", icon: Eye, description: "Stocks you are tracking", group: "Pages" },
  { name: "Research", path: "/research", icon: Bot, description: "AI-powered stock analysis", group: "Pages" },
  { name: "Execution", path: "/execution", icon: Target, description: "Paper trading simulator", group: "Pages" },
  { name: "Analytics", path: "/analytics", icon: LineChart, description: "Risk and performance metrics", group: "Pages" },
  { name: "Alerts", path: "/notifications", icon: Bell, description: "Price alerts and notifications", group: "Pages" },
  { name: "Profile", path: "/profile", icon: UserRound, description: "Your settings and preferences", group: "Pages" },
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, description: "Your custom home screen", group: "Pages" },
  { name: "Trending", path: "/trending", icon: TrendingUp, description: "Popular stocks right now", group: "Pages" },
  { name: "Compare", path: "/compare", icon: GitCompare, description: "Compare multiple stocks", group: "Tools" },
  { name: "Dividends", path: "/dividends", icon: DollarSign, description: "Dividend tracking and calendar", group: "Tools" },
  { name: "Heatmap", path: "/heatmap", icon: Flame, description: "Sector and market heatmap", group: "Tools" },
  { name: "Simulator", path: "/simulator", icon: Dice5, description: "Monte Carlo simulations", group: "Tools" },
  { name: "Goals", path: "/goals", icon: Flag, description: "Investment goal tracking", group: "Tools" },
  { name: "Journal", path: "/journal", icon: BookOpen, description: "Trade journal and notes", group: "Tools" },
  { name: "Calendar", path: "/calendar", icon: Calendar, description: "Earnings and events calendar", group: "Tools" },
  { name: "Sectors", path: "/sectors", icon: BarChart3, description: "Sector breakdown and trends", group: "Tools" },
  { name: "Screener", path: "/screener", icon: SlidersHorizontal, description: "Stock screening filters", group: "Tools" },
  { name: "Sentiment", path: "/sentiment", icon: MessageCircle, description: "Market mood and sentiment", group: "Tools" },
  { name: "Ideas", path: "/ideas", icon: Lightbulb, description: "AI-generated trade ideas", group: "Tools" },
  { name: "Briefing", path: "/briefing", icon: Newspaper, description: "Daily market summary", group: "Tools" },
  { name: "Community", path: "/community", icon: Users, description: "Community discussions", group: "Tools" },
  { name: "Export", path: "/export", icon: Download, description: "Download your data as files", group: "Tools" },
  { name: "Audit", path: "/audit", icon: ClipboardList, description: "Activity and change history", group: "Tools" },
  { name: "Glossary", path: "/glossary", icon: GraduationCap, description: "Stock market terms explained", group: "Education" },
  { name: "Strategies", path: "/strategies", icon: Zap, description: "Trading strategy library", group: "Education" },
  { name: "Learn", path: "/learn", icon: BookOpen, description: "How to use Zentrade", group: "Education" },
];

const GROUP_ORDER: NavItem["group"][] = ["Pages", "Tools", "Education"];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups: { group: NavItem["group"]; items: NavItem[] }[] = [];
    for (const g of GROUP_ORDER) {
      const items = filtered.filter((i) => i.group === g);
      if (items.length > 0) groups.push({ group: g, items });
    }
    return groups;
  }, [filtered]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      close();
      router.push(path);
    },
    [close, router]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[activeIndex]) navigate(flatItems[activeIndex].path);
    } else if (e.key === "Escape") {
      close();
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let itemCounter = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={close}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl surface-glass dynamic-surface overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--surface-border)" }}>
          <Search size={16} className="muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and tools..."
            className="flex-1 bg-transparent text-sm outline-none section-title placeholder:text-[var(--ink-muted)]"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] muted font-semibold control-surface">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {flatItems.length === 0 && (
            <div className="p-4 text-sm muted text-center">No results found. Try a different search.</div>
          )}

          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold px-2 py-1.5 mt-1">
                {group}
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                const idx = itemCounter++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.path}
                    data-active={isActive}
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isActive ? "control-surface" : "hover:opacity-80"
                    }`}
                  >
                    <Icon size={15} style={{ color: isActive ? "var(--accent)" : undefined, flexShrink: 0 }} className={isActive ? "" : "muted"} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold section-title truncate">{item.name}</div>
                      <div className="text-xs muted truncate">{item.description}</div>
                    </div>
                    {isActive && (
                      <CornerDownLeft size={12} className="muted flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px] muted border-t" style={{ borderColor: "var(--surface-border)" }}>
          <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> Navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={10} /> Open</span>
          <span className="flex items-center gap-1">
            <Command size={10} />K Toggle
          </span>
        </div>
      </div>
    </div>
  );
}
