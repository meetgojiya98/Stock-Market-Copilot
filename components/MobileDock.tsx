"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Bot, BriefcaseBusiness, LayoutGrid, SearchCode, Target } from "lucide-react";

type DockItem = {
  label: string;
  href: string;
  protected?: boolean;
  icon: ReactNode;
};

const ITEMS: DockItem[] = [
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
  { label: "More", href: "/dashboard", protected: true, icon: <LayoutGrid size={16} /> },
];

const HIDDEN_PREFIXES = ["/login", "/signup", "/reset-password", "/learn"];

export default function MobileDock() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [bouncingItem, setBouncingItem] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setLoggedIn(Boolean(localStorage.getItem("access_token")));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  const hidden = useMemo(() => {
    if (pathname === "/") return true;
    return HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  if (hidden) return null;

  const navigate = (item: DockItem) => {
    if (item.protected && !loggedIn) {
      router.push("/login");
      return;
    }

    setBouncingItem(item.href);
    setTimeout(() => {
      router.push(item.href);
      setBouncingItem(null);
    }, 200);
  };

  return (
    <div
      className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-[70] w-[min(95vw,430px)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="dock-shell">
        <div className="grid grid-cols-6 gap-1">
          {ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <button
                key={item.href}
                onClick={() => navigate(item)}
                className={`dock-link ${active ? "dock-link-active" : ""}`}
              >
                <span className={`dock-icon-wrap ${active ? "dock-icon-active" : ""} ${bouncingItem === item.href ? "dock-bounce" : ""}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
