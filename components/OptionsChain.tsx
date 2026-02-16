"use client";

import { useCallback, useMemo, useState } from "react";
import { Activity, ChevronDown, Layers, Plus, Trash2, TrendingUp } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OptionRow = {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  oi: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
};

type StrategyLeg = {
  id: number;
  action: "buy" | "sell";
  type: "call" | "put";
  strike: number;
  premium: number;
  qty: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const BASE_PRICES: Record<string, number> = {
  AAPL: 189.84,
  MSFT: 420.55,
  GOOGL: 174.13,
  AMZN: 185.07,
  TSLA: 248.42,
  NVDA: 875.28,
  META: 502.30,
  SPY: 515.68,
  QQQ: 440.22,
  IWM: 203.15,
};

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashStr(str: string, extra: number) {
  return str.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 3), 17) + extra;
}

function generateChain(symbol: string, expIdx: number): { calls: OptionRow[]; puts: OptionRow[]; basePrice: number } {
  const basePrice = BASE_PRICES[symbol.toUpperCase()] ?? 150 + hashStr(symbol, 0) % 300;
  const rng = seeded(hashStr(symbol, expIdx * 1000));

  const step = basePrice > 500 ? 5 : basePrice > 100 ? 2.5 : 1;
  const atmStrike = Math.round(basePrice / step) * step;
  const strikes: number[] = [];
  for (let i = -10; i <= 10; i++) {
    strikes.push(+(atmStrike + i * step).toFixed(2));
  }

  const daysToExp = 7 + expIdx * 14;

  const calls: OptionRow[] = [];
  const puts: OptionRow[] = [];

  for (const strike of strikes) {
    const moneyness = (basePrice - strike) / basePrice;

    // Calls
    const cIv = +(0.18 + Math.abs(moneyness) * 0.4 + rng() * 0.08).toFixed(4);
    const cDelta = +Math.max(0.01, Math.min(0.99, 0.5 + moneyness * 3 + rng() * 0.04)).toFixed(4);
    const cGamma = +(0.001 + (1 - Math.abs(moneyness) * 4) * 0.04 * Math.max(0, 1)).toFixed(4);
    const cTheta = +(-0.01 - rng() * 0.08 - (1 / Math.sqrt(daysToExp)) * 0.02).toFixed(4);
    const cVega = +(0.05 + (1 - Math.abs(moneyness) * 2) * 0.15 * Math.max(0, 1)).toFixed(4);
    const cMid = Math.max(0.01, basePrice * cDelta * Math.sqrt(daysToExp / 365) * cIv);
    const cSpread = cMid * (0.02 + rng() * 0.06);
    const cBid = +Math.max(0.01, cMid - cSpread / 2).toFixed(2);
    const cAsk = +(cMid + cSpread / 2).toFixed(2);
    const cLast = +(cBid + rng() * (cAsk - cBid)).toFixed(2);

    calls.push({
      strike,
      bid: cBid,
      ask: cAsk,
      last: cLast,
      volume: Math.floor(50 + rng() * 5000 * (1 - Math.abs(moneyness) * 2)),
      oi: Math.floor(200 + rng() * 20000 * (1 - Math.abs(moneyness) * 2)),
      iv: cIv,
      delta: cDelta,
      gamma: Math.max(0, cGamma),
      theta: cTheta,
      vega: Math.max(0, cVega),
    });

    // Puts
    const pIv = +(0.20 + Math.abs(moneyness) * 0.45 + rng() * 0.08).toFixed(4);
    const pDelta = +Math.max(-0.99, Math.min(-0.01, -0.5 + moneyness * 3 - rng() * 0.04)).toFixed(4);
    const pGamma = +(0.001 + (1 - Math.abs(moneyness) * 4) * 0.04 * Math.max(0, 1)).toFixed(4);
    const pTheta = +(-0.01 - rng() * 0.08 - (1 / Math.sqrt(daysToExp)) * 0.02).toFixed(4);
    const pVega = +(0.05 + (1 - Math.abs(moneyness) * 2) * 0.15 * Math.max(0, 1)).toFixed(4);
    const pMid = Math.max(0.01, basePrice * Math.abs(pDelta) * Math.sqrt(daysToExp / 365) * pIv);
    const pSpread = pMid * (0.02 + rng() * 0.06);
    const pBid = +Math.max(0.01, pMid - pSpread / 2).toFixed(2);
    const pAsk = +(pMid + pSpread / 2).toFixed(2);
    const pLast = +(pBid + rng() * (pAsk - pBid)).toFixed(2);

    puts.push({
      strike,
      bid: pBid,
      ask: pAsk,
      last: pLast,
      volume: Math.floor(40 + rng() * 4500 * (1 - Math.abs(moneyness) * 2)),
      oi: Math.floor(150 + rng() * 18000 * (1 - Math.abs(moneyness) * 2)),
      iv: pIv,
      delta: pDelta,
      gamma: Math.max(0, pGamma),
      theta: pTheta,
      vega: Math.max(0, pVega),
    });
  }

  return { calls, puts, basePrice };
}

function formatNum(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function generateExpirations(): string[] {
  const now = new Date();
  return [7, 21, 35, 49].map((d) => {
    const dt = new Date(now.getTime() + d * 86400000);
    // Always land on a Friday
    const dayOfWeek = dt.getDay();
    const diff = (5 - dayOfWeek + 7) % 7;
    dt.setDate(dt.getDate() + diff);
    return dt.toISOString().slice(0, 10);
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OptionsChain() {
  const [symbol, setSymbol] = useState("AAPL");
  const [inputSymbol, setInputSymbol] = useState("AAPL");
  const expirations = useMemo(() => generateExpirations(), []);
  const [expIdx, setExpIdx] = useState(0);
  const [legs, setLegs] = useState<StrategyLeg[]>([]);
  const [nextId, setNextId] = useState(1);

  const { calls, puts, basePrice } = useMemo(
    () => generateChain(symbol, expIdx),
    [symbol, expIdx]
  );

  const handleSymbolSubmit = useCallback(() => {
    const clean = inputSymbol.trim().toUpperCase();
    if (clean.length > 0 && clean.length <= 6) setSymbol(clean);
  }, [inputSymbol]);

  /* Strategy helpers */
  const addLeg = useCallback(
    (action: "buy" | "sell", type: "call" | "put", strike: number) => {
      const row = type === "call"
        ? calls.find((c) => c.strike === strike)
        : puts.find((p) => p.strike === strike);
      if (!row) return;
      const premium = action === "buy" ? row.ask : row.bid;
      setLegs((prev) => [...prev, { id: nextId, action, type, strike, premium, qty: 1 }]);
      setNextId((n) => n + 1);
    },
    [calls, puts, nextId]
  );

  const removeLeg = useCallback((id: number) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLegQty = useCallback((id: number, qty: number) => {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, qty) } : l)));
  }, []);

  /* Strategy P&L estimation */
  const strategyStats = useMemo(() => {
    if (legs.length === 0) return null;

    let netDebit = 0;
    for (const leg of legs) {
      const mult = leg.action === "buy" ? -1 : 1;
      netDebit += mult * leg.premium * leg.qty * 100;
    }

    // Calculate max profit / max loss across a range of prices at expiration
    const minStrike = Math.min(...legs.map((l) => l.strike));
    const maxStrike = Math.max(...legs.map((l) => l.strike));
    const range = Math.max(maxStrike - minStrike, basePrice * 0.1);
    const lo = minStrike - range;
    const hi = maxStrike + range;
    const step = (hi - lo) / 200;

    let maxProfit = -Infinity;
    let maxLoss = Infinity;

    for (let price = lo; price <= hi; price += step) {
      let pnl = netDebit;
      for (const leg of legs) {
        const intrinsic =
          leg.type === "call"
            ? Math.max(0, price - leg.strike)
            : Math.max(0, leg.strike - price);
        const mult = leg.action === "buy" ? 1 : -1;
        pnl += mult * intrinsic * leg.qty * 100;
      }
      if (pnl > maxProfit) maxProfit = pnl;
      if (pnl < maxLoss) maxLoss = pnl;
    }

    return {
      netDebit: netDebit,
      maxProfit: maxProfit === Infinity ? "Unlimited" : `$${formatNum(maxProfit)}`,
      maxLoss: maxLoss === -Infinity ? "Unlimited" : `$${formatNum(maxLoss)}`,
      breakeven: "~$" + formatNum(basePrice - netDebit / (legs.reduce((s, l) => s + l.qty, 0) * 100)),
    };
  }, [legs, basePrice]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const COL_HEADERS = ["Bid", "Ask", "Last", "Vol", "OI", "IV", "Delta", "Gamma", "Theta", "Vega"];

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol input */}
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[var(--accent)]" />
            <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Symbol</span>
            <input
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSymbolSubmit()}
              className="control-surface rounded-lg px-3 py-1.5 text-sm font-mono w-24 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="AAPL"
            />
            <button
              onClick={handleSymbolSubmit}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_28%,transparent)] transition-colors"
            >
              Go
            </button>
          </div>

          {/* Underlying price */}
          <div className="flex items-center gap-2 ml-auto">
            <TrendingUp size={14} className="text-[var(--positive)]" />
            <span className="text-sm font-semibold">{symbol}</span>
            <span className="metric-value text-lg font-semibold">${formatNum(basePrice)}</span>
          </div>
        </div>

        {/* Expiration selector */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <ChevronDown size={13} className="muted" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Expiration</span>
          {expirations.map((exp, idx) => (
            <button
              key={exp}
              onClick={() => setExpIdx(idx)}
              className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${
                expIdx === idx
                  ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] font-semibold"
                  : "border-[var(--surface-border)] hover:border-[var(--accent)]"
              }`}
            >
              {new Date(exp + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </button>
          ))}
        </div>
      </div>

      {/* Options chain table */}
      <div className="rounded-2xl surface-glass dynamic-surface p-3 sm:p-4 fade-up overflow-x-auto">
        <table className="options-chain-table w-full text-xs border-collapse">
          <thead>
            <tr>
              <th colSpan={10} className="options-call text-center text-[11px] tracking-[0.12em] uppercase font-semibold py-2 px-2 rounded-tl-lg">
                Calls
              </th>
              <th className="options-strike text-center text-[11px] tracking-[0.12em] uppercase font-semibold py-2 px-2">
                Strike
              </th>
              <th colSpan={10} className="options-put text-center text-[11px] tracking-[0.12em] uppercase font-semibold py-2 px-2 rounded-tr-lg">
                Puts
              </th>
            </tr>
            <tr>
              {COL_HEADERS.map((h) => (
                <th key={`c-${h}`} className="options-call text-right py-1.5 px-1.5 text-[10px] muted font-semibold">
                  {h}
                </th>
              ))}
              <th className="options-strike text-center py-1.5 px-2 text-[10px] muted font-semibold">Price</th>
              {COL_HEADERS.map((h) => (
                <th key={`p-${h}`} className="options-put text-right py-1.5 px-1.5 text-[10px] muted font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((call, i) => {
              const put = puts[i];
              const isItm = call.strike < basePrice;
              const putItm = put.strike > basePrice;
              return (
                <tr key={call.strike} className="border-t border-[var(--surface-border)] hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] transition-colors">
                  {/* Call side */}
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{formatNum(call.bid)}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{formatNum(call.ask)}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{formatNum(call.last)}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{call.volume.toLocaleString()}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{call.oi.toLocaleString()}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{(call.iv * 100).toFixed(1)}%</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{call.delta.toFixed(3)}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{call.gamma.toFixed(4)}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{call.theta.toFixed(4)}</td>
                  <td className={`options-call ${isItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{call.vega.toFixed(4)}</td>

                  {/* Strike */}
                  <td className="options-strike text-center py-1 px-2 font-semibold font-mono">
                    {formatNum(call.strike)}
                  </td>

                  {/* Put side */}
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{formatNum(put.bid)}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{formatNum(put.ask)}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{formatNum(put.last)}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{put.volume.toLocaleString()}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono`}>{put.oi.toLocaleString()}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{(put.iv * 100).toFixed(1)}%</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{put.delta.toFixed(3)}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{put.gamma.toFixed(4)}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{put.theta.toFixed(4)}</td>
                  <td className={`options-put ${putItm ? "options-itm" : ""} text-right py-1 px-1.5 font-mono greek-cell`}>{put.vega.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Strategy Builder */}
      <div className="strategy-builder rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={15} className="text-[var(--accent)]" />
          <span className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Strategy Builder</span>
        </div>

        {/* Add leg controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs muted">Add a leg:</span>
          {(["buy", "sell"] as const).map((action) =>
            (["call", "put"] as const).map((type) => (
              <div key={`${action}-${type}`} className="flex items-center gap-1">
                <select
                  className="control-surface rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addLeg(action, type, parseFloat(e.target.value));
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="" disabled>
                    {action === "buy" ? "Buy" : "Sell"} {type === "call" ? "Call" : "Put"}
                  </option>
                  {calls.map((c) => (
                    <option key={c.strike} value={c.strike}>
                      ${formatNum(c.strike)}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>

        {/* Legs list */}
        {legs.length > 0 ? (
          <div className="space-y-2 mb-4">
            {legs.map((leg) => (
              <div key={leg.id} className="rounded-xl control-surface p-3 flex items-center gap-3 flex-wrap">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    leg.action === "buy"
                      ? "bg-[color-mix(in_srgb,var(--positive)_18%,transparent)] text-[var(--positive)]"
                      : "bg-[color-mix(in_srgb,var(--negative)_18%,transparent)] text-[var(--negative)]"
                  }`}
                >
                  {leg.action}
                </span>
                <span className={`text-xs font-semibold ${leg.type === "call" ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                  {leg.type.toUpperCase()}
                </span>
                <span className="text-xs font-mono">@ ${formatNum(leg.strike)}</span>
                <span className="text-xs muted">Premium: ${formatNum(leg.premium)}</span>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] muted">Qty:</span>
                  <input
                    type="number"
                    value={leg.qty}
                    onChange={(e) => updateLegQty(leg.id, parseInt(e.target.value) || 1)}
                    className="control-surface rounded-md px-2 py-1 text-xs w-14 font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    min={1}
                  />
                  <button
                    onClick={() => removeLeg(leg.id)}
                    className="rounded-md p-1.5 hover:bg-[color-mix(in_srgb,var(--negative)_16%,transparent)] transition-colors text-[var(--negative)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 mb-4">
            <Plus size={24} className="mx-auto mb-2 text-[var(--ink-muted)]" />
            <p className="muted text-sm">Select strikes above to build a multi-leg strategy</p>
          </div>
        )}

        {/* Strategy summary */}
        {strategyStats && (
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="rounded-xl control-surface p-3 text-center">
              <div className="text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1">Net Debit/Credit</div>
              <div className={`metric-value text-sm font-semibold ${strategyStats.netDebit >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                {strategyStats.netDebit >= 0 ? "+" : ""}${formatNum(strategyStats.netDebit)}
              </div>
            </div>
            <div className="rounded-xl control-surface p-3 text-center">
              <div className="text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1">Est. Max Profit</div>
              <div className="metric-value text-sm font-semibold text-[var(--positive)]">{strategyStats.maxProfit}</div>
            </div>
            <div className="rounded-xl control-surface p-3 text-center">
              <div className="text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1">Est. Max Loss</div>
              <div className="metric-value text-sm font-semibold text-[var(--negative)]">{strategyStats.maxLoss}</div>
            </div>
            <div className="rounded-xl control-surface p-3 text-center">
              <div className="text-[10px] tracking-[0.12em] uppercase muted font-semibold mb-1">Approx. Breakeven</div>
              <div className="metric-value text-sm font-semibold">{strategyStats.breakeven}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
