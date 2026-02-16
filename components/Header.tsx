"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BellPlus,
  Bitcoin,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Puzzle,
  Shield,
  SignalHigh,
  Target,
  ScanSearch,
  Sparkles,
  Trophy,
  UserRound,
  X,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Newspaper,
  Users,
  Search,
  CalendarDays,
  TrendingUp,
  Download,
  Lightbulb,
  GitCompare,
  FlaskConical,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import DynamicBackdrop from "./DynamicBackdrop";
import { clearAuthSession } from "../lib/auth-client";

type NavLink = {
  name: string;
  href: string;
  icon: ReactNode;
  protected?: boolean;
};

const NAV_LINKS: NavLink[] = [
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: <BriefcaseBusiness size={16} />,
    protected: true,
  },
  { name: "Watchlist", href: "/watchlist", icon: <ScanSearch size={16} />, protected: true },
  { name: "Research", href: "/research", icon: <Bot size={16} />, protected: true },
  { name: "Execution", href: "/execution", icon: <Target size={16} />, protected: true },
  { name: "Alerts", href: "/notifications", icon: <BellPlus size={16} />, protected: true },
];

type MoreGroup = { label: string; links: NavLink[] };

const MORE_GROUPS: MoreGroup[] = [
  {
    label: "Insights",
    links: [
      { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={16} />, protected: true },
      { name: "Briefing", href: "/briefing", icon: <Newspaper size={16} />, protected: true },
      { name: "Screener", href: "/screener", icon: <Search size={16} />, protected: true },
      { name: "Sectors", href: "/sectors", icon: <BarChart3 size={16} />, protected: true },
      { name: "Sentiment", href: "/sentiment", icon: <TrendingUp size={16} />, protected: true },
      { name: "Signals", href: "/ideas", icon: <SignalHigh size={16} />, protected: true },
    ],
  },
  {
    label: "Trading",
    links: [
      { name: "Options", href: "/options", icon: <Activity size={16} />, protected: true },
      { name: "Crypto", href: "/crypto", icon: <Bitcoin size={16} />, protected: true },
      { name: "Broker", href: "/broker", icon: <Link2 size={16} />, protected: true },
      { name: "Simulator", href: "/simulator", icon: <FlaskConical size={16} />, protected: true },
      { name: "Heatmap", href: "/heatmap", icon: <FlaskConical size={16} />, protected: true },
    ],
  },
  {
    label: "Portfolio Tools",
    links: [
      { name: "Compare", href: "/compare", icon: <GitCompare size={16} />, protected: true },
      { name: "Analytics", href: "/analytics", icon: <BarChart3 size={16} />, protected: true },
      { name: "Goals", href: "/goals", icon: <Target size={16} />, protected: true },
      { name: "Dividends", href: "/dividends", icon: <BarChart3 size={16} />, protected: true },
      { name: "Journal", href: "/journal", icon: <BookOpen size={16} />, protected: true },
      { name: "Benchmarks", href: "/benchmarks", icon: <Trophy size={16} />, protected: true },
    ],
  },
  {
    label: "Community & Learn",
    links: [
      { name: "Calendar", href: "/calendar", icon: <CalendarDays size={16} />, protected: true },
      { name: "Transcripts", href: "/transcripts", icon: <FileText size={16} />, protected: true },
      { name: "Community", href: "/community", icon: <Users size={16} />, protected: true },
      { name: "Export", href: "/export", icon: <Download size={16} />, protected: true },
      { name: "Glossary", href: "/glossary", icon: <BookOpen size={16} /> },
      { name: "Strategies", href: "/strategies", icon: <BookOpen size={16} /> },
    ],
  },
];

function getMarketMeta() {
  const nowInNY = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
    })
  );

  const day = nowInNY.getDay();
  const mins = nowInNY.getHours() * 60 + nowInNY.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && mins >= 570 && mins < 960;

  return {
    time: nowInNY.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    isOpen,
    statusLabel: isOpen ? "US Market Open" : "US Market Closed",
  };
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const hideChrome = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/reset-password") || pathname.startsWith("/learn");

  const [loggedIn, setLoggedIn] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem("access_token"))
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const checkLogin = () => {
      setLoggedIn(Boolean(localStorage.getItem("access_token")));
    };

    checkLogin();
    window.addEventListener("storage", checkLogin);

    return () => window.removeEventListener("storage", checkLogin);
  }, [pathname]);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick((value) => value + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  /* Close the "More" dropdown on outside click */
  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  /* Close the "More" dropdown on navigation */
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  /* Slide the active indicator under the current nav link */
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
  const homeHref = loggedIn ? "/portfolio" : "/login";

  const navigate = (href: string, protectedRoute?: boolean) => {
    if (protectedRoute && !localStorage.getItem("access_token")) {
      router.push("/login");
      return;
    }

    router.push(href);
    setMenuOpen(false);
    setMoreOpen(false);
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
        <DynamicBackdrop variant="aurora" className="opacity-[0.24]" />
        <div className="topbar-inner relative z-[1]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button className="topbar-brand" onClick={() => navigate(homeHref)}>
              <BrandLogo size={36} withWordmark showTagline={false} />
            </button>
            <div className="hidden xl:flex items-center gap-2">
              <span className={`topbar-chip ${marketMeta.isOpen ? "topbar-chip-live" : ""}`}>
                {marketMeta.isOpen && <span className="pulse-dot" />}
                {marketMeta.isOpen ? "Session Live" : "After Hours"}
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
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div ref={moreRef} className="relative hidden lg:block">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`topbar-action ${moreOpen ? "topbar-link-active" : ""}`}
              >
                <LayoutDashboard size={15} />
                <span className="hidden xl:inline">More</span>
                <ChevronDown size={13} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="topbar-more-panel">
                  {MORE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="topbar-more-group-label">{group.label}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {group.links.map((link) => {
                          const active = pathname === link.href;
                          return (
                            <button
                              key={link.href}
                              onClick={() => navigate(link.href, link.protected)}
                              className={`topbar-mobile-link text-xs ${active ? "topbar-mobile-link-active" : ""}`}
                            >
                              {link.icon}
                              {link.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="topbar-search-btn hidden lg:inline-flex"
            >
              <Search size={14} />
              <span className="hidden xl:inline">Search</span>
              <kbd className="topbar-kbd">{"\u2318"}K</kbd>
            </button>
            <button onClick={() => navigate("/research", true)} className="topbar-ai hidden sm:inline-flex">
              <Sparkles size={14} />
              <span className="hidden xl:inline">AI Research</span>
            </button>
            {!loggedIn ? (
              <button className="topbar-action hidden sm:inline-flex" onClick={() => navigate("/login")}>
                <LogIn size={15} />
                <span className="hidden xl:inline">Sign In</span>
              </button>
            ) : (
              <>
                <button className="topbar-action hidden sm:inline-flex" onClick={() => navigate("/profile", true)}>
                  <UserRound size={15} />
                  <span className="hidden xl:inline">Profile</span>
                </button>
                <button className="topbar-action-danger hidden sm:inline-flex" onClick={handleLogout}>
                  <LogOut size={15} />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </>
            )}

            <button
              aria-label="Open navigation"
              className="topbar-icon-btn lg:hidden"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden mt-2 topbar-mobile-sheet rise-stagger">
          <div className="grid gap-2">
            <div className="topbar-mobile-meta">
              {marketMeta.statusLabel} - {marketMeta.time} ET
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

            {MORE_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="topbar-mobile-meta mt-1">{group.label}</div>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {group.links.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <button
                        key={link.href}
                        onClick={() => navigate(link.href, link.protected)}
                        className={`topbar-mobile-link text-xs ${active ? "topbar-mobile-link-active" : ""}`}
                      >
                        {link.icon}
                        {link.name}
                      </button>
                    );
                  })}
                </div>
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
