"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Bot, BriefcaseBusiness, Gauge, SearchCode, Target } from "lucide-react";

type DockItem = {
  label: string;
  href: string;
  protected?: boolean;
  icon: ReactNode;
};

const ITEMS: DockItem[] = [
  { label: "Home", href: "/", icon: <Gauge size={16} /> },
  {
    label: "Portfolio",
    href: "/portfolio",
    protected: true,
    icon: <BriefcaseBusiness size={16} />,
  },
  { label: "Watch", href: "/watchlist", protected: true, icon: <SearchCode size={16} /> },
  { label: "Research", href: "/research", protected: true, icon: <Bot size={16} /> },
  { label: "Exec", href: "/execution", protected: true, icon: <Target size={16} /> },
  { label: "Alerts", href: "/notifications", protected: true, icon: <Bell size={16} /> },
];

const HIDDEN_PREFIXES = ["/login", "/signup"];

export default function MobileDock() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(Boolean(localStorage.getItem("access_token")));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  const hidden = useMemo(
    () => HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
    [pathname]
  );

  if (hidden) return null;

  const navigate = (item: DockItem) => {
    if (item.protected && !loggedIn) {
      router.push("/login");
      return;
    }

    router.push(item.href);
  };

  return (
    <div
      className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-[70] w-[min(96vw,430px)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="surface-glass rounded-2xl px-2 py-2 border soft-divider">
        <div className="grid grid-cols-6 gap-1">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item)}
                className={`rounded-xl px-1 py-2.5 text-[11px] font-medium flex flex-col items-center gap-1 transition ${
                  active
                    ? "bg-gradient-to-r from-[var(--accent)] via-orange-500 to-[var(--accent-2)] text-white"
                    : "control-surface"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
