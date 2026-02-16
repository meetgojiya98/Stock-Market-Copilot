"use client";

import { useState, useEffect, useCallback, type ReactElement } from "react";

type WidgetType =
  | "portfolio_summary"
  | "market_movers"
  | "watchlist_mini"
  | "news_headlines"
  | "price_alert_status"
  | "earnings_this_week";

type WidgetDef = {
  type: WidgetType;
  label: string;
  description: string;
};

const STORAGE_KEY = "smc_dashboard_widgets_v1";

const WIDGET_DEFS: WidgetDef[] = [
  { type: "portfolio_summary", label: "Portfolio Summary", description: "Quick overview of your portfolio value and daily performance" },
  { type: "market_movers", label: "Market Movers", description: "Top gainers and losers across the market today" },
  { type: "watchlist_mini", label: "Watchlist Mini", description: "Compact view of your watched stocks with price changes" },
  { type: "news_headlines", label: "News Headlines", description: "Latest financial news and market-moving headlines" },
  { type: "price_alert_status", label: "Price Alert Status", description: "Active price alerts and their current trigger status" },
  { type: "earnings_this_week", label: "Earnings This Week", description: "Upcoming earnings reports for stocks you follow" },
];

const DEFAULT_WIDGETS: WidgetType[] = [
  "portfolio_summary",
  "market_movers",
  "watchlist_mini",
  "news_headlines",
];

function loadWidgets(): WidgetType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* empty */ }
  return DEFAULT_WIDGETS;
}

function saveWidgets(widgets: WidgetType[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

// --- Mini widget content renderers ---

function PortfolioSummaryWidget() {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[10px] muted">Total Value</div>
          <div className="text-base font-semibold metric-value">$247,832.50</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] muted">Today</div>
          <div className="text-sm font-semibold text-[var(--positive)]">+$1,245.30 (+0.50%)</div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--surface-emphasis)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--positive)]" style={{ width: "62%" }} />
      </div>
      <div className="flex justify-between text-[10px] muted">
        <span>15 positions</span>
        <span>62% invested</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="text-center">
          <div className="text-[9px] muted">Best</div>
          <div className="text-[10px] font-semibold text-[var(--positive)]">NVDA +3.2%</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] muted">Worst</div>
          <div className="text-[10px] font-semibold text-[var(--negative)]">INTC -2.1%</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] muted">Week</div>
          <div className="text-[10px] font-semibold text-[var(--positive)]">+1.8%</div>
        </div>
      </div>
    </div>
  );
}

function MarketMoversWidget() {
  const gainers = [
    { symbol: "SMCI", change: "+12.4%", price: "$42.18" },
    { symbol: "MSTR", change: "+8.7%", price: "$318.50" },
    { symbol: "ARM", change: "+5.2%", price: "$168.90" },
  ];
  const losers = [
    { symbol: "SNAP", change: "-6.8%", price: "$11.24" },
    { symbol: "ROKU", change: "-4.5%", price: "$72.30" },
    { symbol: "COIN", change: "-3.9%", price: "$215.80" },
  ];
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] font-semibold text-[var(--positive)] mb-1">Top Gainers</div>
        {gainers.map((s) => (
          <div key={s.symbol} className="flex justify-between items-center py-0.5">
            <span className="text-xs font-semibold section-title">{s.symbol}</span>
            <span className="text-[10px] muted">{s.price}</span>
            <span className="text-[10px] font-semibold text-[var(--positive)]">{s.change}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="text-[10px] font-semibold text-[var(--negative)] mb-1">Top Losers</div>
        {losers.map((s) => (
          <div key={s.symbol} className="flex justify-between items-center py-0.5">
            <span className="text-xs font-semibold section-title">{s.symbol}</span>
            <span className="text-[10px] muted">{s.price}</span>
            <span className="text-[10px] font-semibold text-[var(--negative)]">{s.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchlistMiniWidget() {
  const items = [
    { symbol: "AAPL", price: "$185.20", change: "+0.8%", positive: true },
    { symbol: "MSFT", price: "$415.60", change: "+1.2%", positive: true },
    { symbol: "GOOGL", price: "$168.90", change: "-0.3%", positive: false },
    { symbol: "TSLA", price: "$192.30", change: "-1.5%", positive: false },
    { symbol: "NVDA", price: "$178.50", change: "+3.2%", positive: true },
  ];
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.symbol} className="flex items-center justify-between py-0.5">
          <span className="text-xs font-semibold section-title w-14">{item.symbol}</span>
          <span className="text-[10px] metric-value flex-1 text-right mr-2">{item.price}</span>
          <span className={`text-[10px] font-semibold w-12 text-right ${item.positive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {item.change}
          </span>
        </div>
      ))}
      <div className="text-[10px] muted text-center pt-1">5 of 12 stocks shown</div>
    </div>
  );
}

function NewsHeadlinesWidget() {
  const headlines = [
    { title: "Fed signals potential rate cuts in H2 2026", time: "2h ago", source: "Reuters" },
    { title: "NVIDIA earnings beat estimates, guidance strong", time: "4h ago", source: "CNBC" },
    { title: "Oil prices drop on increased OPEC+ supply", time: "5h ago", source: "Bloomberg" },
    { title: "Tech stocks rally on AI infrastructure spending boom", time: "6h ago", source: "WSJ" },
  ];
  return (
    <div className="space-y-2">
      {headlines.map((h, i) => (
        <div key={i} className="pb-1.5 border-b border-[var(--surface-border)] last:border-0 last:pb-0">
          <div className="text-xs section-title font-medium leading-snug">{h.title}</div>
          <div className="text-[10px] muted mt-0.5">{h.source} - {h.time}</div>
        </div>
      ))}
    </div>
  );
}

function PriceAlertStatusWidget() {
  const alerts = [
    { symbol: "AAPL", condition: "Below $180", status: "Active", nearTrigger: false },
    { symbol: "TSLA", condition: "Above $200", status: "Active", nearTrigger: true },
    { symbol: "NVDA", condition: "Below $150", status: "Active", nearTrigger: false },
    { symbol: "MSFT", condition: "Above $420", status: "Near trigger", nearTrigger: true },
  ];
  return (
    <div className="space-y-1.5">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-center justify-between py-0.5">
          <div>
            <span className="text-xs font-semibold section-title">{a.symbol}</span>
            <span className="text-[10px] muted ml-1.5">{a.condition}</span>
          </div>
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
            a.nearTrigger
              ? "bg-[color-mix(in_srgb,#f59e0b_16%,transparent)] text-[#f59e0b]"
              : "bg-[color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]"
          }`}>
            {a.status}
          </span>
        </div>
      ))}
      <div className="text-[10px] muted text-center pt-1">4 active alerts</div>
    </div>
  );
}

function EarningsThisWeekWidget() {
  const earnings = [
    { symbol: "COST", date: "Mon", estimate: "$4.08", time: "After close" },
    { symbol: "CRM", date: "Tue", estimate: "$2.35", time: "After close" },
    { symbol: "LULU", date: "Wed", estimate: "$5.42", time: "Before open" },
    { symbol: "AVGO", date: "Thu", estimate: "$1.38", time: "After close" },
  ];
  return (
    <div className="space-y-1.5">
      {earnings.map((e, i) => (
        <div key={i} className="flex items-center justify-between py-0.5">
          <div>
            <span className="text-xs font-semibold section-title">{e.symbol}</span>
            <span className="text-[10px] muted ml-1.5">{e.date}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] metric-value font-semibold">EPS est. {e.estimate}</div>
            <div className="text-[9px] muted">{e.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const WIDGET_RENDERERS: Record<WidgetType, () => ReactElement> = {
  portfolio_summary: PortfolioSummaryWidget,
  market_movers: MarketMoversWidget,
  watchlist_mini: WatchlistMiniWidget,
  news_headlines: NewsHeadlinesWidget,
  price_alert_status: PriceAlertStatusWidget,
  earnings_this_week: EarningsThisWeekWidget,
};

export default function CustomDashboard() {
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setActiveWidgets(loadWidgets());
    setMounted(true);
  }, []);

  const updateWidgets = useCallback((next: WidgetType[]) => {
    setActiveWidgets(next);
    saveWidgets(next);
  }, []);

  const removeWidget = useCallback((type: WidgetType) => {
    updateWidgets(activeWidgets.filter((w) => w !== type));
  }, [activeWidgets, updateWidgets]);

  const addWidget = useCallback((type: WidgetType) => {
    if (!activeWidgets.includes(type)) {
      updateWidgets([...activeWidgets, type]);
    }
    setShowSelector(false);
  }, [activeWidgets, updateWidgets]);

  const availableWidgets = WIDGET_DEFS.filter((w) => !activeWidgets.includes(w.type));

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold section-title">Custom Dashboard Widgets</h2>
            <p className="text-xs muted mt-0.5">{activeWidgets.length} widget{activeWidgets.length !== 1 ? "s" : ""} active</p>
          </div>
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="widget-add-btn inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-xs font-semibold"
          >
            {showSelector ? "Cancel" : "+ Add Widget"}
          </button>
        </div>
      </div>

      {/* Widget selector */}
      {showSelector && (
        <div className="rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
          <div className="text-xs font-semibold section-title mb-3">Choose a widget to add</div>
          {availableWidgets.length === 0 ? (
            <p className="text-xs muted">All widgets are already active.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableWidgets.map((w) => (
                <button
                  key={w.type}
                  onClick={() => addWidget(w.type)}
                  className="rounded-xl control-surface p-3 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="text-xs font-semibold section-title">{w.label}</div>
                  <div className="text-[10px] muted mt-0.5 leading-relaxed">{w.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Widget grid */}
      {activeWidgets.length === 0 ? (
        <div className="rounded-2xl surface-glass dynamic-surface p-8 text-center fade-up">
          <p className="muted text-sm">No widgets active. Click &quot;Add Widget&quot; to get started.</p>
        </div>
      ) : (
        <div className="widget-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeWidgets.map((type) => {
            const def = WIDGET_DEFS.find((w) => w.type === type);
            if (!def) return null;
            const Renderer = WIDGET_RENDERERS[type];
            return (
              <div key={type} className="widget-card rounded-2xl surface-glass dynamic-surface p-4 sm:p-5 fade-up">
                <div className="widget-header flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold section-title">{def.label}</span>
                  <button
                    onClick={() => removeWidget(type)}
                    className="text-[var(--ink-muted)] hover:text-[var(--negative)] text-xs font-bold px-1 transition-colors"
                    title="Remove widget"
                  >
                    x
                  </button>
                </div>
                <div className="widget-body">
                  <Renderer />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
