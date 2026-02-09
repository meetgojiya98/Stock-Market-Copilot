"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BellPlus,
  Bot,
  BriefcaseBusiness,
  Gauge,
  LineChart,
  LogIn,
  LogOut,
  Menu,
  MoonStar,
  Target,
  ScanSearch,
  Sparkles,
  SunMedium,
  UserRound,
  X,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { clearAuthSession, getAuthModeLabel } from "../lib/auth-client";

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

  const [dark, setDark] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authModeLabel, setAuthModeLabel] = useState("Remote Mode");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDark(savedTheme === "dark");
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const checkLogin = () => {
      setLoggedIn(Boolean(localStorage.getItem("access_token")));
      setAuthModeLabel(getAuthModeLabel());
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

  return (
    <header className="sticky top-0 z-50 fade-in">
      <div className="border-b soft-divider backdrop-blur-2xl bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)]">
        <div className="pro-container py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="control-surface px-2.5 py-1.5 inline-flex items-center"
              onClick={() => navigate("/")}
            >
              <BrandLogo size={38} withWordmark showTagline={false} />
            </button>

            <div className="hidden xl:flex items-center gap-2 text-[11px]">
              <span className="rounded-full px-2.5 py-1 border soft-divider bg-white/70 dark:bg-black/30 inline-flex items-center gap-1">
                {marketMeta.isOpen && <span className="pulse-dot" />}
                {marketMeta.statusLabel}
              </span>
              <span className="rounded-full px-2.5 py-1 border soft-divider bg-white/70 dark:bg-black/30 muted">
                {marketMeta.time} ET
              </span>
              {loggedIn && (
                <span className="rounded-full px-2.5 py-1 badge-neutral inline-flex items-center gap-1">
                  <LineChart size={11} />
                  {authModeLabel}
                </span>
              )}
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1.5 rounded-2xl p-1.5 border soft-divider bg-[color-mix(in_srgb,var(--surface)_82%,transparent)]">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href, link.protected)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                    active
                      ? "bg-gradient-to-r from-[var(--accent)] via-orange-500 to-[var(--accent-2)] text-white shadow"
                      : "control-surface"
                  }`}
                >
                  {link.icon}
                  {link.name}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/research", true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-2)] to-cyan-500 text-white text-sm font-semibold shadow"
            >
              <Sparkles size={14} />
              AI Lab
            </button>

            <button
              aria-label="Toggle theme"
              className="h-10 w-10 rounded-xl control-surface grid place-items-center"
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </button>

            {!loggedIn ? (
              <button
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl control-surface text-sm font-semibold"
                onClick={() => navigate("/login")}
              >
                <LogIn size={15} />
                Sign In
              </button>
            ) : (
              <>
                <button
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl control-surface text-sm font-semibold"
                  onClick={() => navigate("/profile", true)}
                >
                  <UserRound size={15} />
                  Profile
                </button>
                <button
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            )}

            <button
              aria-label="Open navigation"
              className="lg:hidden h-10 w-10 rounded-xl control-surface grid place-items-center"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-b soft-divider bg-[color-mix(in_srgb,var(--surface-strong)_88%,transparent)] backdrop-blur-xl">
          <div className="pro-container py-3 grid gap-2 rise-stagger">
            <div className="text-[11px] muted rounded-xl border soft-divider bg-white/70 dark:bg-black/25 px-3 py-2">
              {marketMeta.statusLabel} - {marketMeta.time} ET
              {loggedIn ? ` - ${authModeLabel}` : ""}
            </div>

            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href, link.protected)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition inline-flex items-center gap-2 ${
                    active
                      ? "bg-gradient-to-r from-[var(--accent)] via-orange-500 to-[var(--accent-2)] text-white"
                      : "control-surface"
                  }`}
                >
                  {link.icon}
                  {link.name}
                </button>
              );
            })}

            {!loggedIn ? (
              <button
                className="w-full text-left px-3 py-2.5 rounded-xl bg-[var(--accent-2)] text-white text-sm font-semibold inline-flex items-center gap-2"
                onClick={() => navigate("/login")}
              >
                <LogIn size={15} />
                Sign In
              </button>
            ) : (
              <button
                className="w-full text-left px-3 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                onClick={handleLogout}
              >
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
