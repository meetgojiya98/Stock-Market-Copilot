"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Link2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { createLocalAlert } from "../lib/data-client";
import {
  connectBrokerAccount,
  disconnectBrokerAccount,
  fetchBrokerAccounts,
  providerDisplayName,
  syncBrokerAccountFromPaper,
  type BrokerAccount,
  type BrokerProvider,
} from "../lib/broker-readonly";
import type { PaperTradingLedger } from "../lib/paper-trading";

type BrokerIntegrationsLabProps = {
  ledger: PaperTradingLedger;
  quotes: Record<string, { price: number }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BrokerIntegrationsLab({
  ledger,
  quotes,
}: BrokerIntegrationsLabProps) {
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [provider, setProvider] = useState<BrokerProvider>("alpaca");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const connectedCount = useMemo(
    () => accounts.filter((item) => item.status === "connected").length,
    [accounts]
  );

  useEffect(() => {
    const load = async () => {
      const result = await fetchBrokerAccounts();
      setAccounts(result.data);
    };
    load();
  }, []);

  const handleConnect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await connectBrokerAccount({ provider, label });
      setAccounts(result.data);
      if (!result.ok) {
        setError(result.detail || "Unable to connect broker account.");
        return;
      }

      const message = `${providerDisplayName(provider)} connected in read-only mode.`;
      setNotice(message);
      createLocalAlert("BROKER", message, "execution");
      setLabel("");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string, accountLabel: string) => {
    const result = await disconnectBrokerAccount(accountId);
    setAccounts(result.data);
    const message = `${accountLabel} disconnected.`;
    setNotice(message);
    createLocalAlert("BROKER", message, "execution");
  };

  const handleSync = async (account: BrokerAccount) => {
    const result = await syncBrokerAccountFromPaper(account.id, {
      cash: ledger.cash,
      positions: ledger.positions,
      quotes,
    });
    setAccounts(result.data);
    if (!result.ok) {
      setError(result.detail || "Unable to sync account.");
      return;
    }

    const message = `${account.label} read-only snapshot synced (${ledger.positions.length} positions).`;
    setNotice(message);
    createLocalAlert("BROKER", message, "execution");
  };

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <Link2 size={16} />
          Broker Integrations (Read-Only)
        </h3>
        <span className="text-xs rounded-full px-2 py-0.5 badge-neutral">
          {connectedCount} connected
        </span>
      </div>

      <p className="text-xs muted">
        Connect external broker profiles in read-only mode, sync balances/positions, and keep trade routing disabled until simulator trust is fully established.
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

      <form onSubmit={handleConnect} className="grid sm:grid-cols-3 gap-2">
        <label className="text-xs space-y-1">
          <div className="muted">Broker</div>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as BrokerProvider)}
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
          >
            <option value="alpaca">Alpaca</option>
            <option value="interactive_brokers">Interactive Brokers</option>
            <option value="schwab">Charles Schwab</option>
            <option value="robinhood">Robinhood</option>
          </select>
        </label>

        <label className="text-xs space-y-1 sm:col-span-2">
          <div className="muted">Account Label</div>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Primary Personal Account"
            className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-3 inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-2 text-sm font-semibold disabled:opacity-70"
        >
          <PlugZap size={13} />
          {loading ? "Connecting..." : "Connect Read-Only Profile"}
        </button>
      </form>

      <div className="space-y-2">
        {accounts.length === 0 && (
          <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-3 py-2 text-xs muted">
            No broker profiles connected.
          </div>
        )}

        {accounts.map((account) => (
          <div
            key={account.id}
            className="rounded-lg control-surface bg-white/75 dark:bg-black/25 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-sm font-semibold">
                  {account.label} • {providerDisplayName(account.provider)}
                </div>
                <div className="text-xs muted">
                  Connected: {formatDate(account.connectedAt)} • Last sync: {formatDate(account.lastSyncedAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    account.status === "connected" ? "badge-positive" : "badge-neutral"
                  }`}
                >
                  {account.status.toUpperCase()}
                </span>
                <span className="rounded-full px-2 py-0.5 text-[11px] badge-neutral">
                  READ-ONLY
                </span>
              </div>
            </div>

            <div className="mt-2 grid sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="muted">Cash:</span> <span className="metric-value">{formatMoney(account.balance)}</span>
              </div>
              <div>
                <span className="muted">Equity:</span> <span className="metric-value">{formatMoney(account.equity)}</span>
              </div>
              <div>
                <span className="muted">Positions:</span> <span className="metric-value">{account.positions.length}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleSync(account)}
                disabled={account.status !== "connected"}
                className="inline-flex items-center gap-1 rounded-lg control-surface bg-white/80 dark:bg-black/25 px-2.5 py-1 text-[11px] disabled:opacity-60"
              >
                <RefreshCw size={11} />
                Sync Snapshot
              </button>
              <button
                onClick={() => handleDisconnect(account.id, account.label)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-400/45 bg-red-500/10 text-red-600 dark:text-red-300 px-2.5 py-1 text-[11px]"
              >
                <Unplug size={11} />
                Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 px-3 py-2 text-xs muted">
        <ShieldCheck size={12} className="inline mr-1" />
        Trade routing remains disabled in this phase. Integration is strictly balances/positions visibility.
      </div>
    </section>
  );
}
