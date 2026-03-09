"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "../../components/PageShell";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Clock,
  ShoppingCart,
  BarChart3,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  getPaperAccount,
  resetPaperAccount,
  executePaperOrder,
  calculatePnL,
  getEquity,
  getMockPrice,
  type PaperAccount,
} from "../../lib/paper-trading";

export default function PaperTradingPage() {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const reload = useCallback(() => {
    setAccount(getPaperAccount());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!account) return null;

  const equity = getEquity(account);
  const pnl = calculatePnL(account);
  const totalPnL = equity - account.startingBalance;
  const pnlPercent = (totalPnL / account.startingBalance) * 100;

  function handleSubmitOrder() {
    if (!symbol.trim() || !shares) return;
    const result = executePaperOrder({
      symbol: symbol.toUpperCase().trim(),
      side,
      shares: parseInt(shares),
      type: orderType,
      limitPrice: orderType === "limit" ? parseFloat(limitPrice) : undefined,
    });
    setMessage({
      text: result.message,
      type: result.success ? "success" : "error",
    });
    setAccount(result.account);
    if (result.success) {
      setSymbol("");
      setShares("");
      setLimitPrice("");
    }
    setTimeout(() => setMessage(null), 4000);
  }

  function handleQuickOrder(qty: number) {
    if (!symbol.trim()) return;
    const result = executePaperOrder({
      symbol: symbol.toUpperCase().trim(),
      side,
      shares: qty,
      type: "market",
    });
    setMessage({
      text: result.message,
      type: result.success ? "success" : "error",
    });
    setAccount(result.account);
    setTimeout(() => setMessage(null), 4000);
  }

  function handleReset() {
    const acct = resetPaperAccount();
    setAccount(acct);
    setShowResetConfirm(false);
    setMessage({ text: "Account reset to $100,000.", type: "success" });
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <PageShell
      title="Paper Trading Simulator"
      subtitle="Practice trading with a simulated $100,000 account — no real money at risk"
      actions={
        <button
          onClick={() => setShowResetConfirm(true)}
          className="glass-card flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
          style={{ color: "var(--warning)", borderColor: "var(--surface-border)" }}
        >
          <RotateCcw size={16} />
          Reset Account
        </button>
      }
    >
      {/* Toast message */}
      {message && (
        <div
          className="glass-card p-3 flex items-center gap-2 text-sm font-medium"
          style={{
            color: message.type === "success" ? "var(--positive)" : "var(--negative)",
            borderColor: message.type === "success" ? "var(--positive)" : "var(--negative)",
          }}
        >
          {message.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Account overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
            <DollarSign size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Cash Balance</span>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
            ${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
            <BarChart3 size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Equity</span>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
            ${equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
            <TrendingUp size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Total P&L</span>
          </div>
          <p
            className="text-xl font-bold"
            style={{ color: totalPnL >= 0 ? "var(--positive)" : "var(--negative)" }}
          >
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--ink-muted)" }}>
            <TrendingUp size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">P&L %</span>
          </div>
          <p
            className="text-xl font-bold"
            style={{ color: pnlPercent >= 0 ? "var(--positive)" : "var(--negative)" }}
          >
            {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Order entry */}
      <div className="glass-card p-5 mt-4">
        <h3 className="text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2" style={{ color: "var(--ink)" }}>
          <ShoppingCart size={16} />
          Place Order
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
              Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. AAPL"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--surface-border)",
                color: "var(--ink)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
              Side
            </label>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--surface-border)" }}>
              <button
                onClick={() => setSide("buy")}
                className="flex-1 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                style={{
                  background: side === "buy" ? "var(--positive)" : "var(--surface-2)",
                  color: side === "buy" ? "#fff" : "var(--ink-muted)",
                }}
              >
                <ArrowUpCircle size={14} /> Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className="flex-1 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                style={{
                  background: side === "sell" ? "var(--negative)" : "var(--surface-2)",
                  color: side === "sell" ? "#fff" : "var(--ink-muted)",
                }}
              >
                <ArrowDownCircle size={14} /> Sell
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
              Shares
            </label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="Qty"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--surface-border)",
                color: "var(--ink)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as "market" | "limit")}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--surface-border)",
                color: "var(--ink)",
              }}
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-muted)" }}>
              {orderType === "limit" ? "Limit Price" : "Est. Price"}
            </label>
            {orderType === "limit" ? (
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="$0.00"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--surface-border)",
                  color: "var(--ink)",
                }}
              />
            ) : (
              <div
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--surface-border)",
                  color: "var(--ink-muted)",
                }}
              >
                {symbol.trim()
                  ? `$${getMockPrice(symbol.toUpperCase().trim()).toFixed(2)}`
                  : "—"}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            onClick={handleSubmitOrder}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: side === "buy" ? "var(--positive)" : "var(--negative)" }}
          >
            {side === "buy" ? "Buy" : "Sell"} {shares || "0"} Shares
          </button>

          <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
            Quick:
          </span>
          {[10, 50, 100].map((qty) => (
            <button
              key={qty}
              onClick={() => handleQuickOrder(qty)}
              className="glass-card px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ color: side === "buy" ? "var(--positive)" : "var(--negative)" }}
            >
              {side === "buy" ? "Buy" : "Sell"} {qty}
            </button>
          ))}
        </div>
      </div>

      {/* Open positions */}
      <div className="glass-card mt-4 overflow-x-auto">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--surface-border)" }}>
          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--ink)" }}>
            Open Positions
          </h3>
        </div>
        {account.positions.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                {["Symbol", "Shares", "Avg Cost", "Current Price", "Market Value", "Unrealized P&L"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {account.positions.map((pos) => {
                const curPrice = getMockPrice(pos.symbol);
                const marketVal = curPrice * pos.shares;
                const uPnL = (curPrice - pos.avgCost) * pos.shares;
                const isUp = uPnL >= 0;
                return (
                  <tr
                    key={pos.symbol}
                    style={{ borderBottom: "1px solid var(--surface-border)" }}
                  >
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink)" }}>
                      {pos.symbol}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                      {pos.shares}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-muted)" }}>
                      ${pos.avgCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                      ${curPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                      ${marketVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isUp ? "+" : ""}${uPnL.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center" style={{ color: "var(--ink-muted)" }}>
            <BarChart3 size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No open positions. Place an order to get started.</p>
          </div>
        )}
      </div>

      {/* Order history */}
      <div className="glass-card mt-4 overflow-x-auto">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--surface-border)" }}>
          <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <Clock size={14} />
            Order History
          </h3>
        </div>
        {account.orders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                {["Time", "Side", "Symbol", "Shares", "Price", "Type", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {account.orders.slice(0, 50).map((o) => (
                <tr
                  key={o.id}
                  style={{ borderBottom: "1px solid var(--surface-border)" }}
                >
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--ink-muted)" }}>
                    {new Date(o.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        color: o.side === "buy" ? "var(--positive)" : "var(--negative)",
                        background: o.side === "buy" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      }}
                    >
                      {o.side === "buy" ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                      {o.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--ink)" }}>
                    {o.symbol}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                    {o.shares}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--ink)" }}>
                    ${o.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase" style={{ color: "var(--ink-muted)" }}>
                    {o.type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{
                        color:
                          o.status === "filled"
                            ? "var(--positive)"
                            : o.status === "cancelled"
                              ? "var(--negative)"
                              : "var(--warning)",
                        background:
                          o.status === "filled"
                            ? "rgba(16,185,129,0.1)"
                            : o.status === "cancelled"
                              ? "rgba(239,68,68,0.1)"
                              : "rgba(245,158,11,0.1)",
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center" style={{ color: "var(--ink-muted)" }}>
            <Clock size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No orders yet.</p>
          </div>
        )}
      </div>

      {/* Reset confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="glass-card p-6 w-full max-w-sm mx-4" style={{ background: "var(--surface)" }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--ink)" }}>
              Reset Account?
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
              This will reset your balance to $100,000 and clear all positions and order history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium border"
                style={{
                  borderColor: "var(--surface-border)",
                  color: "var(--ink-muted)",
                  background: "var(--surface-2)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--warning)" }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
