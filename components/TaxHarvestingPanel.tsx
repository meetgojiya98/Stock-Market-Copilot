"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Leaf, Scale, ShieldAlert } from "lucide-react";

type Position = { symbol: string; shares: number; avg_cost: number };
type JournalEntry = { symbol: string; action: string; date: string; price: number; shares: number; notes?: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

async function fetchPrice(symbol: string): Promise<number> {
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/price/${symbol}`, { cache: "no-store" });
      if (r.ok) { const d = await r.json(); const p = Number(d?.price); if (Number.isFinite(p) && p > 0) return p; }
    } catch { /* */ }
  }
  try {
    const r = await fetch(`/api/stocks/price?symbol=${symbol}`, { cache: "no-store" });
    if (r.ok) { const d = await r.json(); const p = Number(d?.price); if (Number.isFinite(p) && p > 0) return p; }
  } catch { /* */ }
  return 0;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

export default function TaxHarvestingPanel() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState({ washSales: true, harvesting: true, summary: true });

  const toggle = (section: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [section]: !s[section] }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smc_portfolio_v3");
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) setPositions(p); }
    } catch { /* */ }
    try {
      const raw = localStorage.getItem("smc_journal_v1");
      if (raw) { const j = JSON.parse(raw); if (Array.isArray(j)) setJournal(j); }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!positions.length) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const entries = await Promise.all(
        positions.map(async (p) => [p.symbol, await fetchPrice(p.symbol)] as const)
      );
      if (!cancelled) { setPrices(Object.fromEntries(entries)); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [positions]);

  // Wash sale detection
  const washSales = useMemo(() => {
    const results: { symbol: string; sellDate: string; buyDate: string; daysDiff: number }[] = [];
    const sells = journal.filter((e) => e.action?.toLowerCase() === "sell");
    const buys = journal.filter((e) => e.action?.toLowerCase() === "buy");

    for (const sell of sells) {
      for (const buy of buys) {
        if (sell.symbol === buy.symbol) {
          const diff = daysBetween(sell.date, buy.date);
          if (diff <= 30 && diff > 0) {
            results.push({ symbol: sell.symbol, sellDate: sell.date, buyDate: buy.date, daysDiff: Math.round(diff) });
          }
        }
      }
    }
    return results;
  }, [journal]);

  // Harvesting suggestions
  const harvestSuggestions = useMemo(() => {
    return positions
      .map((p) => {
        const current = prices[p.symbol] || 0;
        if (!current || !p.avg_cost || current >= p.avg_cost) return null;
        const unrealizedLoss = (current - p.avg_cost) * p.shares;
        return { symbol: p.symbol, shares: p.shares, avgCost: p.avg_cost, currentPrice: current, unrealizedLoss };
      })
      .filter(Boolean)
      .sort((a, b) => a!.unrealizedLoss - b!.unrealizedLoss) as {
      symbol: string; shares: number; avgCost: number; currentPrice: number; unrealizedLoss: number;
    }[];
  }, [positions, prices]);

  // Tax summary (LTCG vs STCG estimate)
  const taxSummary = useMemo(() => {
    const now = new Date();
    let ltcg = 0;
    let stcg = 0;
    const oneYear = 365;

    // Use journal buy entries to estimate holding period
    const buyDates: Record<string, string> = {};
    for (const entry of journal) {
      if (entry.action?.toLowerCase() === "buy" && !buyDates[entry.symbol]) {
        buyDates[entry.symbol] = entry.date;
      }
    }

    for (const p of positions) {
      const current = prices[p.symbol] || 0;
      if (!current || !p.avg_cost) continue;
      const gain = (current - p.avg_cost) * p.shares;
      const buyDate = buyDates[p.symbol];
      const holdDays = buyDate ? daysBetween(buyDate, now.toISOString()) : 400; // default to LTCG if unknown

      if (holdDays >= oneYear) {
        ltcg += gain;
      } else {
        stcg += gain;
      }
    }

    return { ltcg, stcg, total: ltcg + stcg };
  }, [positions, prices, journal]);

  if (!positions.length && !loading) return null;

  const SectionHeader = ({ title, icon: Icon, section, badge }: { title: string; icon: typeof AlertTriangle; section: keyof typeof openSections; badge?: string }) => (
    <button onClick={() => toggle(section)} className="w-full flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold section-title">{title}</span>
        {badge && <span className="text-[11px] badge-neutral rounded-full px-2 py-0.5">{badge}</span>}
      </div>
      {openSections[section] ? <ChevronUp size={14} className="muted" /> : <ChevronDown size={14} className="muted" />}
    </button>
  );

  return (
    <div className="card-elevated rounded-xl p-4 space-y-4 fade-up">
      <div className="flex items-center gap-2">
        <Scale size={16} style={{ color: "var(--accent)" }} />
        <h3 className="text-sm font-semibold section-title">Tax Insights</h3>
      </div>

      {loading && <div className="text-xs muted text-center py-4">Analyzing tax implications...</div>}

      {!loading && (
        <>
          {/* Wash Sales */}
          <div className="space-y-2">
            <SectionHeader title="Wash Sale Alerts" icon={ShieldAlert} section="washSales" badge={`${washSales.length}`} />
            {openSections.washSales && (
              <div className="space-y-1.5">
                {washSales.length === 0 && <p className="text-xs muted py-2">No wash sale violations detected.</p>}
                {washSales.map((ws, i) => (
                  <div key={i} className="tax-wash-sale rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5 text-xs">
                    <div className="font-semibold">{ws.symbol}</div>
                    <div className="muted mt-0.5">
                      Sold {new Date(ws.sellDate).toLocaleDateString()} — Repurchased {new Date(ws.buyDate).toLocaleDateString()} ({ws.daysDiff} days apart)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Harvesting Suggestions */}
          <div className="space-y-2">
            <SectionHeader title="Harvesting Opportunities" icon={Leaf} section="harvesting" badge={`${harvestSuggestions.length}`} />
            {openSections.harvesting && (
              <div className="space-y-1.5">
                {harvestSuggestions.length === 0 && <p className="text-xs muted py-2">No unrealized losses to harvest.</p>}
                {harvestSuggestions.map((s) => (
                  <div key={s.symbol} className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5 text-xs flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{s.symbol}</div>
                      <div className="muted mt-0.5">
                        {s.shares} shares @ {formatMoney(s.avgCost)} → {formatMoney(s.currentPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[var(--negative)]">{formatMoney(s.unrealizedLoss)}</div>
                      <div className="muted">unrealized loss</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tax Summary */}
          <div className="space-y-2">
            <SectionHeader title="Estimated Tax Breakdown" icon={AlertTriangle} section="summary" />
            {openSections.summary && (
              <div className="grid sm:grid-cols-3 gap-2">
                <div className="tax-ltcg rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5">
                  <div className="text-[10px] muted uppercase tracking-wider font-semibold">Long-Term</div>
                  <div className={`text-sm font-semibold mt-0.5 ${taxSummary.ltcg >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {formatMoney(taxSummary.ltcg)}
                  </div>
                </div>
                <div className="tax-stcg rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5">
                  <div className="text-[10px] muted uppercase tracking-wider font-semibold">Short-Term</div>
                  <div className={`text-sm font-semibold mt-0.5 ${taxSummary.stcg >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {formatMoney(taxSummary.stcg)}
                  </div>
                </div>
                <div className="rounded-lg control-surface bg-white/70 dark:bg-black/25 p-2.5">
                  <div className="text-[10px] muted uppercase tracking-wider font-semibold">Total</div>
                  <div className={`text-sm font-semibold mt-0.5 ${taxSummary.total >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {formatMoney(taxSummary.total)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
