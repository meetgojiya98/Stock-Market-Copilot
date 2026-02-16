"use client";

import { useState, useMemo } from "react";

type Position = {
  symbol: string;
  name: string;
  purchasePrice: number;
  currentPrice: number;
  shares: number;
  holdingPeriod: "short" | "long";
  purchaseDate: string;
  washSaleRisk: boolean;
  sector: string;
  replacement: string;
};

const MOCK_POSITIONS: Position[] = [
  { symbol: "AAPL", name: "Apple Inc.", purchasePrice: 198.50, currentPrice: 185.20, shares: 50, holdingPeriod: "long", purchaseDate: "2023-03-15", washSaleRisk: false, sector: "Technology", replacement: "MSFT" },
  { symbol: "TSLA", name: "Tesla Inc.", purchasePrice: 275.00, currentPrice: 192.30, shares: 30, holdingPeriod: "short", purchaseDate: "2025-06-20", washSaleRisk: true, sector: "Consumer Discretionary", replacement: "RIVN" },
  { symbol: "NVDA", name: "NVIDIA Corp.", purchasePrice: 142.80, currentPrice: 178.50, shares: 100, holdingPeriod: "long", purchaseDate: "2023-08-10", washSaleRisk: false, sector: "Technology", replacement: "AMD" },
  { symbol: "META", name: "Meta Platforms", purchasePrice: 520.00, currentPrice: 485.70, shares: 20, holdingPeriod: "short", purchaseDate: "2025-09-05", washSaleRisk: false, sector: "Communication", replacement: "SNAP" },
  { symbol: "GOOGL", name: "Alphabet Inc.", purchasePrice: 175.40, currentPrice: 168.90, shares: 40, holdingPeriod: "long", purchaseDate: "2024-01-12", washSaleRisk: false, sector: "Communication", replacement: "MSFT" },
  { symbol: "AMZN", name: "Amazon.com", purchasePrice: 195.00, currentPrice: 210.40, shares: 35, holdingPeriod: "long", purchaseDate: "2023-11-28", washSaleRisk: false, sector: "Consumer Discretionary", replacement: "WMT" },
  { symbol: "JPM", name: "JPMorgan Chase", purchasePrice: 210.00, currentPrice: 198.50, shares: 25, holdingPeriod: "short", purchaseDate: "2025-08-14", washSaleRisk: true, sector: "Financials", replacement: "BAC" },
  { symbol: "DIS", name: "Walt Disney Co.", purchasePrice: 118.00, currentPrice: 95.40, shares: 60, holdingPeriod: "long", purchaseDate: "2023-05-22", washSaleRisk: false, sector: "Communication", replacement: "CMCSA" },
  { symbol: "BA", name: "Boeing Co.", purchasePrice: 245.00, currentPrice: 178.20, shares: 15, holdingPeriod: "long", purchaseDate: "2024-02-08", washSaleRisk: false, sector: "Industrials", replacement: "LMT" },
  { symbol: "PFE", name: "Pfizer Inc.", purchasePrice: 32.50, currentPrice: 26.80, shares: 200, holdingPeriod: "long", purchaseDate: "2023-09-18", washSaleRisk: false, sector: "Healthcare", replacement: "MRK" },
  { symbol: "INTC", name: "Intel Corp.", purchasePrice: 42.00, currentPrice: 24.50, shares: 150, holdingPeriod: "short", purchaseDate: "2025-04-10", washSaleRisk: true, sector: "Technology", replacement: "AMD" },
  { symbol: "NKE", name: "Nike Inc.", purchasePrice: 108.00, currentPrice: 78.90, shares: 45, holdingPeriod: "long", purchaseDate: "2024-03-25", washSaleRisk: false, sector: "Consumer Discretionary", replacement: "LULU" },
  { symbol: "V", name: "Visa Inc.", purchasePrice: 285.00, currentPrice: 298.40, shares: 20, holdingPeriod: "long", purchaseDate: "2023-07-05", washSaleRisk: false, sector: "Financials", replacement: "MA" },
];

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function formatMoneyShort(v: number) {
  if (Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  }
  return formatMoney(v);
}

function downloadCSV(positions: Position[]) {
  const headers = [
    "Symbol", "Name", "Purchase Price", "Current Price", "Shares",
    "Unrealized P/L", "Holding Period", "Wash Sale Risk", "Sector", "Suggested Replacement"
  ];
  const rows = positions.map((p) => {
    const unrealizedPL = (p.currentPrice - p.purchasePrice) * p.shares;
    return [
      p.symbol,
      `"${p.name}"`,
      p.purchasePrice.toFixed(2),
      p.currentPrice.toFixed(2),
      p.shares.toString(),
      unrealizedPL.toFixed(2),
      p.holdingPeriod === "long" ? "Long-term" : "Short-term",
      p.washSaleRisk ? "Yes" : "No",
      p.sector,
      p.replacement,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax_loss_harvest_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(positions: Position[]) {
  // Generate a text-based report and download as CSV since we can't generate real PDF without a library
  const lines: string[] = [];
  lines.push("TAX LOSS HARVESTING REPORT");
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push("SUMMARY");

  const losses = positions
    .map((p) => ({ ...p, pl: (p.currentPrice - p.purchasePrice) * p.shares }))
    .filter((p) => p.pl < 0);
  const totalLosses = losses.reduce((s, p) => s + p.pl, 0);
  const taxSavings = Math.abs(totalLosses) * 0.25;
  const washSaleCount = losses.filter((p) => p.washSaleRisk).length;

  lines.push(`Total Unrealized Losses: ${formatMoney(totalLosses)}`);
  lines.push(`Estimated Tax Savings (25%): ${formatMoney(taxSavings)}`);
  lines.push(`Positions Eligible for Harvest: ${losses.filter((p) => !p.washSaleRisk).length}`);
  lines.push(`Wash Sale Warnings: ${washSaleCount}`);
  lines.push("");
  lines.push("POSITION DETAILS");
  lines.push("-".repeat(80));

  for (const p of positions) {
    const pl = (p.currentPrice - p.purchasePrice) * p.shares;
    lines.push(`${p.symbol} (${p.name})`);
    lines.push(`  Shares: ${p.shares} | Purchase: ${formatMoney(p.purchasePrice)} | Current: ${formatMoney(p.currentPrice)}`);
    lines.push(`  Unrealized P/L: ${formatMoney(pl)} | Holding: ${p.holdingPeriod === "long" ? "Long-term" : "Short-term"}`);
    if (p.washSaleRisk) lines.push(`  ** WASH SALE RISK **`);
    if (pl < 0 && !p.washSaleRisk) lines.push(`  Recommendation: Sell and replace with ${p.replacement}`);
    lines.push("");
  }

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax_loss_harvest_report_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TaxLossReport() {
  const [filter, setFilter] = useState<"all" | "losses" | "gains">("all");

  const positions = MOCK_POSITIONS;

  const enriched = useMemo(
    () =>
      positions.map((p) => ({
        ...p,
        unrealizedPL: (p.currentPrice - p.purchasePrice) * p.shares,
        unrealizedPLPercent: ((p.currentPrice - p.purchasePrice) / p.purchasePrice) * 100,
      })),
    [positions]
  );

  const filtered = useMemo(() => {
    if (filter === "losses") return enriched.filter((p) => p.unrealizedPL < 0);
    if (filter === "gains") return enriched.filter((p) => p.unrealizedPL >= 0);
    return enriched;
  }, [enriched, filter]);

  const totalUnrealizedLosses = useMemo(
    () => enriched.filter((p) => p.unrealizedPL < 0).reduce((s, p) => s + p.unrealizedPL, 0),
    [enriched]
  );

  const estimatedTaxSavings = Math.abs(totalUnrealizedLosses) * 0.25;

  const eligibleForHarvest = useMemo(
    () => enriched.filter((p) => p.unrealizedPL < 0 && !p.washSaleRisk).length,
    [enriched]
  );

  const washSaleWarnings = useMemo(
    () => enriched.filter((p) => p.washSaleRisk && p.unrealizedPL < 0).length,
    [enriched]
  );

  const harvestRecommendations = useMemo(
    () => enriched.filter((p) => p.unrealizedPL < 0 && !p.washSaleRisk).sort((a, b) => a.unrealizedPL - b.unrealizedPL),
    [enriched]
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold section-title">Tax Loss Harvesting Report</h2>
            <p className="text-xs muted mt-0.5">Identify positions to harvest for tax savings</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadCSV(positions)} className="tax-export-btn inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold">
              Export CSV
            </button>
            <button onClick={() => downloadPDF(positions)} className="tax-export-btn inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs font-semibold muted hover:opacity-80">
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="tax-summary-card rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Total Unrealized Losses</div>
          <div className="mt-1 text-lg font-semibold text-[var(--negative)]">{formatMoneyShort(totalUnrealizedLosses)}</div>
        </div>
        <div className="tax-summary-card rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Est. Tax Savings (25%)</div>
          <div className="tax-savings mt-1 text-lg font-semibold text-[var(--positive)]">{formatMoneyShort(estimatedTaxSavings)}</div>
        </div>
        <div className="tax-summary-card rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Eligible for Harvest</div>
          <div className="mt-1 text-lg metric-value font-semibold">{eligibleForHarvest} positions</div>
        </div>
        <div className="tax-summary-card rounded-xl control-surface p-3">
          <div className="text-[11px] tracking-[0.12em] uppercase muted font-semibold">Wash Sale Warnings</div>
          <div className="tax-wash-sale mt-1 text-lg font-semibold" style={{ color: washSaleWarnings > 0 ? "var(--negative)" : "var(--positive)" }}>
            {washSaleWarnings} {washSaleWarnings === 1 ? "alert" : "alerts"}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg control-surface p-1 w-fit">
        {(["all", "losses", "gains"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "bg-[var(--accent)] text-white" : "muted hover:opacity-80"
            }`}
          >
            {f === "all" ? "All Positions" : f === "losses" ? "Losses Only" : "Gains Only"}
          </button>
        ))}
      </div>

      {/* Positions table */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b border-[var(--surface-border)]">
              <th className="pb-2 font-semibold muted">Symbol</th>
              <th className="pb-2 font-semibold muted">Purchase</th>
              <th className="pb-2 font-semibold muted">Current</th>
              <th className="pb-2 font-semibold muted">Shares</th>
              <th className="pb-2 font-semibold muted">Unrealized P/L</th>
              <th className="pb-2 font-semibold muted">Holding</th>
              <th className="pb-2 font-semibold muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.symbol}
                className={`tax-loss-row border-b border-[var(--surface-border)] last:border-0 ${
                  p.unrealizedPL < 0 && !p.washSaleRisk ? "bg-[color-mix(in_srgb,var(--positive)_4%,transparent)]" : ""
                }`}
              >
                <td className="py-2.5">
                  <div className="font-semibold section-title">{p.symbol}</div>
                  <div className="muted text-[10px]">{p.name}</div>
                </td>
                <td className="py-2.5 metric-value">{formatMoney(p.purchasePrice)}</td>
                <td className="py-2.5 metric-value">{formatMoney(p.currentPrice)}</td>
                <td className="py-2.5 metric-value">{p.shares}</td>
                <td className="py-2.5">
                  <span className={`font-semibold ${p.unrealizedPL >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {p.unrealizedPL >= 0 ? "+" : ""}{formatMoney(p.unrealizedPL)}
                  </span>
                  <div className={`text-[10px] ${p.unrealizedPLPercent >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
                    {p.unrealizedPLPercent >= 0 ? "+" : ""}{p.unrealizedPLPercent.toFixed(1)}%
                  </div>
                </td>
                <td className="py-2.5">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    p.holdingPeriod === "long"
                      ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                      : "bg-[color-mix(in_srgb,#f59e0b_16%,transparent)] text-[#f59e0b]"
                  }`}>
                    {p.holdingPeriod === "long" ? "Long-term" : "Short-term"}
                  </span>
                </td>
                <td className="py-2.5">
                  {p.washSaleRisk && p.unrealizedPL < 0 ? (
                    <span className="tax-wash-sale inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[color-mix(in_srgb,var(--negative)_16%,transparent)] text-[var(--negative)]">
                      Wash Sale Risk
                    </span>
                  ) : p.unrealizedPL < 0 ? (
                    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]">
                      Harvestable
                    </span>
                  ) : (
                    <span className="muted text-[10px]">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Harvest Recommendations */}
      {harvestRecommendations.length > 0 && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <h3 className="text-sm font-semibold section-title mb-3">Harvest Recommendations</h3>
          <p className="text-xs muted mb-3">
            The following positions have unrealized losses and can be sold to offset capital gains. Suggested replacement securities maintain similar market exposure while avoiding wash sale rules.
          </p>
          <div className="space-y-2">
            {harvestRecommendations.map((p) => (
              <div key={p.symbol} className="tax-loss-row rounded-xl control-surface p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <div className="font-semibold text-sm section-title">{p.symbol}</div>
                  <div className="text-[10px] muted">{p.name}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] muted">Loss</div>
                  <div className="text-sm font-semibold text-[var(--negative)]">{formatMoney(p.unrealizedPL)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] muted">Tax Saved</div>
                  <div className="tax-savings text-sm font-semibold text-[var(--positive)]">{formatMoney(Math.abs(p.unrealizedPL) * 0.25)}</div>
                </div>
                <div className="text-center px-3 py-1.5 rounded-lg border border-[var(--surface-border)]">
                  <div className="text-[10px] muted">Replace with</div>
                  <div className="text-sm font-semibold metric-value">{p.replacement}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl control-surface p-3">
            <div className="text-xs muted">
              <strong>Total potential tax savings:</strong>{" "}
              <span className="tax-savings text-[var(--positive)] font-semibold">
                {formatMoney(harvestRecommendations.reduce((s, p) => s + Math.abs(p.unrealizedPL) * 0.25, 0))}
              </span>
              {" "}by harvesting {harvestRecommendations.length} position{harvestRecommendations.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
