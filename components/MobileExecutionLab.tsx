"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Download,
  RefreshCw,
  Smartphone,
  Zap,
} from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type MobileExecutionLabProps = {
  activeSymbol: string;
  activePrice: number;
  openOrders: number;
  onQuickTrade: (side: "buy" | "sell", quantity: number) => Promise<{
    ok: boolean;
    detail?: string;
  }>;
  onRefresh: () => Promise<void>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MobileExecutionLab({
  activeSymbol,
  activePrice,
  openOrders,
  onQuickTrade,
  onRefresh,
}: MobileExecutionLabProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const canInstall = useMemo(() => Boolean(installEvent) && !installed, [installEvent, installed]);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);
    setServiceWorkerReady(Boolean(navigator.serviceWorker?.controller));
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setNotice("PWA installed. Mobile quick actions are now available from your home screen.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    setError("");
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setNotice("Install accepted. Finishing setup...");
    } else {
      setNotice("Install dismissed.");
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof Notification === "undefined") {
      setError("Notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      setNotice("Push notifications enabled for mobile execution alerts.");
    } else {
      setError("Notification permission was not granted.");
    }
  };

  const runQuickTrade = async (side: "buy" | "sell", quantity: number) => {
    setBusyAction(`${side}-${quantity}`);
    setError("");
    setNotice("");

    try {
      const result = await onQuickTrade(side, quantity);
      if (!result.ok) {
        setError(result.detail || "Quick action failed.");
      } else {
        setNotice(
          `${side === "buy" ? "Buy" : "Sell"} ${quantity} ${activeSymbol} queued from quick action.`
        );
      }
    } finally {
      setBusyAction("");
    }
  };

  const handleRefresh = async () => {
    setBusyAction("refresh");
    setError("");
    try {
      await onRefresh();
      setNotice("Execution workspace refreshed.");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Refresh failed.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <Smartphone size={16} />
          PWA + Mobile Execution UX
        </h3>
        <div className="text-xs muted">
          {installed ? "Installed app mode" : "Browser mode"}
        </div>
      </div>

      <p className="text-xs muted">
        Install the app, enable push notifications, and use quick action cards to execute in real-time on mobile.
      </p>

      {(notice || error) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs">
          <div className="muted">Active Symbol</div>
          <div className="mt-1 font-semibold">{activeSymbol || "—"}</div>
          <div className="muted">{activePrice > 0 ? formatMoney(activePrice) : "Price unavailable"}</div>
        </div>
        <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs">
          <div className="muted">Open Orders</div>
          <div className="mt-1 font-semibold">{openOrders}</div>
        </div>
        <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs">
          <div className="muted">Service Worker</div>
          <div className={`mt-1 font-semibold ${serviceWorkerReady ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {serviceWorkerReady ? "Active" : "Not controlling page yet"}
          </div>
        </div>
        <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2 text-xs">
          <div className="muted">Notifications</div>
          <div
            className={`mt-1 font-semibold ${
              notificationPermission === "granted"
                ? "text-[var(--positive)]"
                : notificationPermission === "denied"
                ? "text-[var(--negative)]"
                : ""
            }`}
          >
            {notificationPermission.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleInstall}
          disabled={!canInstall}
          className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs disabled:opacity-60"
        >
          <Download size={12} />
          {canInstall ? "Install App" : "Install Unavailable"}
        </button>
        <button
          onClick={handleEnableNotifications}
          className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
        >
          <Bell size={12} />
          Enable Push
        </button>
        <button
          onClick={handleRefresh}
          disabled={busyAction === "refresh"}
          className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs disabled:opacity-70"
        >
          <RefreshCw size={12} />
          {busyAction === "refresh" ? "Refreshing..." : "Refresh Market"}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <button
          onClick={() => runQuickTrade("buy", 1)}
          disabled={busyAction === "buy-1"}
          className="rounded-lg border border-emerald-400/50 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-sm font-semibold disabled:opacity-70"
        >
          <Zap size={13} className="inline mr-1" />
          Buy 1 {activeSymbol}
        </button>
        <button
          onClick={() => runQuickTrade("sell", 1)}
          disabled={busyAction === "sell-1"}
          className="rounded-lg border border-red-400/50 bg-red-500/12 text-red-600 dark:text-red-300 px-3 py-2 text-sm font-semibold disabled:opacity-70"
        >
          <Zap size={13} className="inline mr-1" />
          Sell 1 {activeSymbol}
        </button>
        <button
          onClick={() => runQuickTrade("buy", 5)}
          disabled={busyAction === "buy-5"}
          className="rounded-lg border border-[var(--accent-2)] bg-[color-mix(in_srgb,var(--accent-2)_14%,transparent)] px-3 py-2 text-sm font-semibold disabled:opacity-70"
        >
          Buy 5 Fast
        </button>
        <button
          onClick={() => runQuickTrade("sell", 5)}
          disabled={busyAction === "sell-5"}
          className="rounded-lg border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-2 text-sm font-semibold disabled:opacity-70"
        >
          Sell 5 Fast
        </button>
      </div>
    </section>
  );
}
