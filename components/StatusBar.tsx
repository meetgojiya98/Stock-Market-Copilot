"use client";

import { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";

type IndexQuote = { label: string; value: number; change: number };

function getMarketOpen() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960;
}

export default function StatusBar({ className = "" }: { className?: string }) {
  const [online, setOnline] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [indices] = useState<IndexQuote[]>([
    { label: "S&P 500", value: 5842.31, change: 0.34 },
    { label: "NASDAQ", value: 18563.77, change: 0.52 },
    { label: "DOW", value: 43127.58, change: -0.11 },
  ]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setIsOpen(getMarketOpen());

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(() => setIsOpen(getMarketOpen()), 60_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`status-bar ${className}`}>
      <div className="status-bar-inner">
        <div className="status-bar-indices">
          {indices.map((idx) => (
            <span key={idx.label} className="status-bar-index">
              <span className="status-bar-index-label">{idx.label}</span>
              <span className={`status-bar-index-change ${idx.change >= 0 ? "positive" : "negative"}`}>
                {idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>

        <div className="status-bar-right">
          <span className={`status-bar-market ${isOpen ? "open" : "closed"}`}>
            <Activity size={10} />
            {isOpen ? "Market Open" : "After Hours"}
          </span>
          <span className={`status-bar-connection ${online ? "online" : "offline"}`}>
            {online ? <Wifi size={10} /> : <WifiOff size={10} />}
          </span>
        </div>
      </div>
    </div>
  );
}
