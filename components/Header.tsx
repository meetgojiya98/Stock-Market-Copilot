"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BellPlus,
  Bot,
  BriefcaseBusiness,
  Gauge,
  LogIn,
  LogOut,
  Menu,
  Target,
  ScanSearch,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import DynamicBackdrop from "./DynamicBackdrop";
import ThemeModeSwitch from "./ThemeModeSwitch";
import { clearAuthSession } from "../lib/auth-client";
import { useThemeMode } from "../lib/use-theme-mode";

type NavLink = {
  name: string;
  href: string;
  icon: ReactNode;
  protected?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/", icon: <Gauge size={16} /> },
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: <BriefcaseBusiness size={16} />,
    protected: true,
  },
  { name: "Watchlist", href: "/watchlist", icon: <ScanSearch size={16} />, protected: true },
  { name: "Analytics", href: "/analytics", icon: <Activity size={16} />, protected: true },
  { name: "Research", href: "/research", icon: <Bot size={16} />, protected: true },
  { name: "Execution", href: "/execution", icon: <Target size={16} />, protected: true },
  { name: "Alerts", href: "/notifications", icon: <BellPlus size={16} />, protected: true },
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
  const hideChrome = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup");

  const { mode, resolvedMode, setThemeMode } = useThemeMode();
  const [loggedIn, setLoggedIn] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem("access_token"))
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const showThemeControl =
    loggedIn || pathname.startsWith("/login") || pathname.startsWith("/signup");

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

  const marketMeta = useMemo(() => getMarketMeta(), [clockTick]);

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
      <div className="topbar-shell relative overflow-hidden">
        <DynamicBackdrop variant={resolvedMode === "dark" ? "mesh" : "aurora"} className="opacity-[0.24]" />
        <div className="topbar-inner relative z-[1]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button className="topbar-brand" onClick={() => navigate("/")}>
              <BrandLogo size={36} withWordmark showTagline={false} />
            </button>
            <div className="hidden xl:flex items-center gap-2">
              <span className={`topbar-chip ${marketMeta.isOpen ? "topbar-chip-live" : ""}`}>
                {marketMeta.isOpen && <span className="pulse-dot" />}
                {marketMeta.isOpen ? "Session Live" : "After Hours"}
              </span>
            </div>
          </div>

          <nav className="topbar-nav hidden lg:flex">
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
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate("/research", true)} className="topbar-ai hidden sm:inline-flex">
              <Sparkles size={14} />
              <span className="hidden xl:inline">Research AI</span>
            </button>
            {showThemeControl && (
              <ThemeModeSwitch className="hidden md:inline-flex" mode={mode} onModeChange={setThemeMode} />
            )}

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

            {showThemeControl && (
              <ThemeModeSwitch className="md:hidden" mode={mode} onModeChange={setThemeMode} />
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
