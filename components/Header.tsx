"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bitcoin,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Calendar,
  ChevronDown,
  Copy,
  Eye,
  Gauge,
  GitBranch,
  Globe,
  LayoutDashboard,
  LineChart,
  Link,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  PieChart,
  Play,
  Rss,
  Search,
  Settings,
  Sparkles,
  Store,
  Terminal,
  TrendingDown,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import DarkModeToggle from "./DarkModeToggle";
import NotificationCenter from "./NotificationCenter";
import { clearAuthSession } from "../lib/auth-client";

type NavLink = {
  name: string;
  href: string;
  icon: ReactNode;
  protected?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={15} />, protected: true },
  { name: "Agents", href: "/agents", icon: <Bot size={15} />, protected: true },
  { name: "Research", href: "/research", icon: <Sparkles size={15} />, protected: true },
  { name: "Portfolio", href: "/portfolio", icon: <BriefcaseBusiness size={15} />, protected: true },
  { name: "Watchlist", href: "/watchlist", icon: <Eye size={15} />, protected: true },
  { name: "Terminal", href: "/terminal", icon: <Terminal size={15} />, protected: true },
];

function getMarketMeta() {
  const nowInNY = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = nowInNY.getDay();
  const mins = nowInNY.getHours() * 60 + nowInNY.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && mins >= 570 && mins < 960;

  return {
    time: nowInNY.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    isOpen,
    statusLabel: isOpen ? "US Market Open" : "US Market Closed",
  };
}

type MoreLink = { name: string; href: string; icon: ReactNode };
type MoreSection = { label: string; links: MoreLink[] };

const MORE_SECTIONS: MoreSection[] = [
  {
    label: "Market Data",
    links: [
      { name: "Heatmap", href: "/heatmap", icon: <BarChart3 size={14} /> },
      { name: "Sentiment", href: "/sentiment", icon: <Gauge size={14} /> },
      { name: "Compare", href: "/compare", icon: <LineChart size={14} /> },
      { name: "Sectors", href: "/sectors", icon: <BarChart3 size={14} /> },
      { name: "Crypto", href: "/crypto", icon: <Bitcoin size={14} /> },
    ],
  },
  {
    label: "Trading",
    links: [
      { name: "Options", href: "/options", icon: <GitBranch size={14} /> },
      { name: "Insiders", href: "/insiders", icon: <UserCheck size={14} /> },
      { name: "Paper Trading", href: "/paper-trading", icon: <Play size={14} /> },
      { name: "Journal", href: "/journal", icon: <BookOpen size={14} /> },
      { name: "Portfolios", href: "/portfolios", icon: <Wallet size={14} /> },
    ],
  },
  {
    label: "Calendars",
    links: [
      { name: "Earnings", href: "/earnings", icon: <Calendar size={14} /> },
      { name: "Economic", href: "/economic-calendar", icon: <Globe size={14} /> },
    ],
  },
  {
    label: "Analytics",
    links: [
      { name: "Performance", href: "/performance", icon: <TrendingDown size={14} /> },
      { name: "Correlation", href: "/correlation", icon: <PieChart size={14} /> },
      { name: "Drawdown", href: "/drawdown", icon: <TrendingDown size={14} /> },
      { name: "Backtest", href: "/backtest", icon: <Play size={14} /> },
    ],
  },
  {
    label: "AI & Agents",
    links: [
      { name: "Agent Chains", href: "/chains", icon: <Link size={14} /> },
      { name: "NL Alerts", href: "/nl-alerts", icon: <MessageSquare size={14} /> },
      { name: "Trade Replay", href: "/replay", icon: <Play size={14} /> },
      { name: "Workflows", href: "/workflows", icon: <Play size={14} /> },
      { name: "Templates", href: "/templates", icon: <Store size={14} /> },
      { name: "Leaderboard", href: "/leaderboard", icon: <Trophy size={14} /> },
    ],
  },
  {
    label: "Social",
    links: [
      { name: "Profiles", href: "/profiles", icon: <Users size={14} /> },
      { name: "Signal Feed", href: "/signals", icon: <Rss size={14} /> },
      { name: "Copy Trading", href: "/copy-trading", icon: <Copy size={14} /> },
    ],
  },
  {
    label: "System",
    links: [
      { name: "Alerts", href: "/alerts", icon: <Bell size={14} /> },
      { name: "Webhooks", href: "/webhooks", icon: <Globe size={14} /> },
      { name: "Settings", href: "/settings", icon: <Settings size={14} /> },
    ],
  },
];

const ALL_MORE_LINKS = MORE_SECTIONS.flatMap((s) => s.links);

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const hideChrome =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/pricing");

  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const checkLogin = () => setLoggedIn(Boolean(localStorage.getItem("access_token")));
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, [pathname]);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick((v) => v + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  useEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    const activeLink = nav.querySelector<HTMLElement>(".topbar-link-active");
    if (activeLink) {
      indicator.style.width = `${activeLink.offsetWidth}px`;
      indicator.style.transform = `translateX(${activeLink.offsetLeft}px)`;
    } else {
      indicator.style.width = "0";
    }
  }, [pathname]);

  const marketMeta = useMemo(() => getMarketMeta(), [clockTick]);
  const homeHref = loggedIn ? "/dashboard" : "/login";

  const navigate = (href: string, protectedRoute?: boolean) => {
    if (protectedRoute && !localStorage.getItem("access_token")) {
      router.push("/login");
      return;
    }
    router.push(href);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    setLoggedIn(false);
    setMenuOpen(false);
    router.push("/login");
  };

  if (hideChrome) return null;

  return (
    <header className="sticky top-0 z-50 px-2 sm:px-3 pt-2 fade-in">
      <div className="topbar-shell relative">
        <div className="topbar-inner relative z-[1]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button className="topbar-brand" onClick={() => navigate(homeHref)}>
              <BrandLogo size={32} withWordmark showTagline={false} />
            </button>
            <div className="hidden xl:flex items-center gap-1.5">
              <span className={`topbar-chip ${marketMeta.isOpen ? "topbar-chip-live" : ""}`}>
                {marketMeta.isOpen && <span className="pulse-dot" />}
                {marketMeta.isOpen ? "Market Open" : "After Hours"}
              </span>
              <span className="topbar-chip">{marketMeta.time} ET</span>
            </div>
          </div>

          <nav ref={navRef} className="topbar-nav hidden lg:flex" style={{ position: "relative" }}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href, link.protected)}
                  className={`topbar-link ${active ? "topbar-link-active" : ""}`}
                >
                  {link.icon}
                  {link.name}
                </button>
              );
            })}
            <span ref={indicatorRef} className="topbar-indicator" />
            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`topbar-link ${ALL_MORE_LINKS.some((l) => pathname === l.href) ? "topbar-link-active" : ""}`}
              >
                More
                <ChevronDown size={12} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-56 p-1.5 shadow-xl z-50 rounded-xl border"
                  style={{
                    maxHeight: "calc(100vh - 100px)",
                    overflowY: "auto",
                    background: "var(--surface)",
                    borderColor: "var(--surface-border)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {MORE_SECTIONS.map((section) => (
                    <div key={section.label}>
                      <div className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--ink-muted)", opacity: 0.6 }}>
                        {section.label}
                      </div>
                      {section.links.map((link) => {
                        const active = pathname === link.href;
                        return (
                          <button
                            key={link.href}
                            onClick={() => navigate(link.href, true)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              active
                                ? "text-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_10%,transparent)]"
                                : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                            }`}
                          >
                            {link.icon}
                            {link.name}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="topbar-search-btn hidden lg:inline-flex"
            >
              <Search size={13} />
              <span className="hidden xl:inline">Search</span>
              <kbd className="topbar-kbd">{"\u2318"}K</kbd>
            </button>
            <DarkModeToggle />
            {loggedIn && <NotificationCenter />}
            {!loggedIn ? (
              <button className="topbar-action hidden sm:inline-flex" onClick={() => navigate("/login")}>
                <LogIn size={14} />
                <span className="hidden xl:inline">Sign In</span>
              </button>
            ) : (
              <>
                <button className="topbar-action-danger hidden sm:inline-flex" onClick={handleLogout}>
                  <LogOut size={14} />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </>
            )}
            <button
              aria-label="Open navigation"
              className="topbar-icon-btn lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden mt-1.5 topbar-mobile-sheet rise-stagger max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="grid gap-1.5">
            <div className="topbar-mobile-meta">
              {marketMeta.statusLabel} &middot; {marketMeta.time} ET
            </div>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href, link.protected)}
                  className={`topbar-mobile-link ${active ? "topbar-mobile-link-active" : ""}`}
                >
                  {link.icon}
                  {link.name}
                </button>
              );
            })}
            {MORE_SECTIONS.map((section) => (
              <div key={section.label}>
                <div className="topbar-mobile-meta mt-1">{section.label}</div>
                {section.links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href, true)}
                      className={`topbar-mobile-link ${active ? "topbar-mobile-link-active" : ""}`}
                    >
                      {link.icon}
                      {link.name}
                    </button>
                  );
                })}
              </div>
            ))}
            {!loggedIn ? (
              <button className="topbar-mobile-auth" onClick={() => navigate("/login")}>
                <LogIn size={15} />
                Sign In
              </button>
            ) : (
              <button className="topbar-mobile-auth topbar-mobile-auth-danger" onClick={handleLogout}>
                <LogOut size={15} />
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
