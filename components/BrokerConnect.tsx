"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  DollarSign,
  Link2,
  PlugZap,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Unplug,
  Wallet,
} from "lucide-react";

type BrokerProvider = "alpaca" | "interactive_brokers" | "td_ameritrade" | "webull";

type BrokerConnection = {
  provider: BrokerProvider;
  connected: boolean;
  connectedAt: string | null;
  accountValue: number;
  buyingPower: number;
  dayPnL: number;
  openOrders: number;
};

const STORAGE_KEY = "smc_broker_connections_v1";

const BROKER_INFO: Record<
  BrokerProvider,
  { name: string; description: string; icon: React.ReactNode }
> = {
  alpaca: {
    name: "Alpaca",
    description: "Commission-free API-first stock and crypto trading platform.",
    icon: <BarChart3 size={20} />,
  },
  interactive_brokers: {
    name: "Interactive Brokers",
    description: "Professional-grade brokerage with global market access and advanced tools.",
    icon: <TrendingUp size={20} />,
  },
  td_ameritrade: {
    name: "TD Ameritrade",
    description: "Full-service brokerage with thinkorswim platform and extensive research.",
    icon: <Wallet size={20} />,
  },
  webull: {
    name: "Webull",
    description: "Zero-commission trading with extended hours and advanced charting.",
    icon: <DollarSign size={20} />,
  },
};

const PROVIDERS: BrokerProvider[] = [
  "alpaca",
  "interactive_brokers",
  "td_ameritrade",
  "webull",
];

function generateMockAccount(): Pick<
  BrokerConnection,
  "accountValue" | "buyingPower" | "dayPnL" | "openOrders"
> {
  const accountValue = 25000 + Math.random() * 475000;
  const buyingPower = accountValue * (0.3 + Math.random() * 0.5);
  const dayPnL = (Math.random() - 0.45) * accountValue * 0.02;
  const openOrders = Math.floor(Math.random() * 8);

  return {
    accountValue: parseFloat(accountValue.toFixed(2)),
    buyingPower: parseFloat(buyingPower.toFixed(2)),
    dayPnL: parseFloat(dayPnL.toFixed(2)),
    openOrders,
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function loadConnections(): Record<BrokerProvider, BrokerConnection> {
  const defaults: Record<BrokerProvider, BrokerConnection> = {} as Record<
    BrokerProvider,
    BrokerConnection
  >;
  PROVIDERS.forEach((p) => {
    defaults[p] = {
      provider: p,
      connected: false,
      connectedAt: null,
      accountValue: 0,
      buyingPower: 0,
      dayPnL: 0,
      openOrders: 0,
    };
  });

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, BrokerConnection>;
      PROVIDERS.forEach((p) => {
        if (parsed[p]) {
          defaults[p] = { ...defaults[p], ...parsed[p] };
        }
      });
    }
  } catch {
    // ignore
  }
  return defaults;
}

function persistConnections(connections: Record<BrokerProvider, BrokerConnection>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
  } catch {
    // ignore
  }
}

export default function BrokerConnect() {
  const [connections, setConnections] = useState<Record<BrokerProvider, BrokerConnection>>(
    loadConnections
  );
  const [connecting, setConnecting] = useState<BrokerProvider | null>(null);

  useEffect(() => {
    setConnections(loadConnections());
  }, []);

  const handleConnect = useCallback(
    (provider: BrokerProvider) => {
      setConnecting(provider);

      // Simulate connection delay
      setTimeout(() => {
        const mockAccount = generateMockAccount();
        const next = {
          ...connections,
          [provider]: {
            ...connections[provider],
            connected: true,
            connectedAt: new Date().toISOString(),
            ...mockAccount,
          },
        };
        setConnections(next);
        persistConnections(next);
        setConnecting(null);
      }, 1200 + Math.random() * 800);
    },
    [connections]
  );

  const handleDisconnect = useCallback(
    (provider: BrokerProvider) => {
      const next = {
        ...connections,
        [provider]: {
          ...connections[provider],
          connected: false,
          connectedAt: null,
          accountValue: 0,
          buyingPower: 0,
          dayPnL: 0,
          openOrders: 0,
        },
      };
      setConnections(next);
      persistConnections(next);
    },
    [connections]
  );

  const handleRefresh = useCallback(
    (provider: BrokerProvider) => {
      const mockAccount = generateMockAccount();
      const next = {
        ...connections,
        [provider]: {
          ...connections[provider],
          ...mockAccount,
        },
      };
      setConnections(next);
      persistConnections(next);
    },
    [connections]
  );

  const connectedCount = PROVIDERS.filter((p) => connections[p].connected).length;

  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold flex items-center gap-2">
              <Link2 size={13} style={{ color: "var(--accent)" }} />
              Broker Integration Hub
            </div>
            <p className="text-sm muted mt-1">
              Connect your brokerage accounts for unified portfolio visibility and trade execution.
            </p>
          </div>
          <span className="text-[11px] rounded-full px-2.5 py-0.5 badge-neutral font-semibold">
            {connectedCount} of {PROVIDERS.length} connected
          </span>
        </div>
      </div>

      {/* Broker cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => {
          const conn = connections[provider];
          const info = BROKER_INFO[provider];
          const isConnecting = connecting === provider;

          return (
            <div
              key={provider}
              className={`broker-card surface-glass dynamic-surface ${
                conn.connected ? "broker-card-connected" : ""
              }`}
            >
              {/* Left: logo + info */}
              <div className="flex items-start gap-3 flex-1">
                <div className="broker-logo" style={{ color: "var(--accent)" }}>
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold section-title">{info.name}</span>
                    <span
                      className={`broker-status-dot ${
                        conn.connected ? "connected" : "disconnected"
                      }`}
                    />
                  </div>
                  <p className="text-xs muted">{info.description}</p>

                  {/* Account summary when connected */}
                  {conn.connected && (
                    <div className="broker-account-summary mt-3">
                      <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2.5 py-1.5">
                        <div className="text-[10px] muted">Account Value</div>
                        <div className="text-sm font-bold metric-value">
                          {formatMoney(conn.accountValue)}
                        </div>
                      </div>
                      <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2.5 py-1.5">
                        <div className="text-[10px] muted">Buying Power</div>
                        <div className="text-sm font-bold metric-value">
                          {formatMoney(conn.buyingPower)}
                        </div>
                      </div>
                      <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2.5 py-1.5">
                        <div className="text-[10px] muted">Day P/L</div>
                        <div
                          className="text-sm font-bold"
                          style={{
                            color:
                              conn.dayPnL >= 0
                                ? "var(--positive)"
                                : "var(--negative)",
                          }}
                        >
                          {conn.dayPnL >= 0 ? "+" : ""}
                          {formatMoney(conn.dayPnL)}
                        </div>
                      </div>
                      <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-2.5 py-1.5">
                        <div className="text-[10px] muted flex items-center gap-1">
                          <ShoppingCart size={10} />
                          Open Orders
                        </div>
                        <div className="text-sm font-bold metric-value">
                          {conn.openOrders}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {conn.connected ? (
                      <>
                        <button
                          onClick={() => handleRefresh(provider)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <RefreshCw size={11} />
                          Refresh
                        </button>
                        <button
                          onClick={() => handleDisconnect(provider)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2.5 py-1.5 text-[11px] font-semibold"
                        >
                          <Unplug size={11} />
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(provider)}
                        disabled={isConnecting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        <PlugZap size={12} className={isConnecting ? "animate-pulse" : ""} />
                        {isConnecting ? "Connecting..." : "Connect"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
