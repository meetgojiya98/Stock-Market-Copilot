"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Filter,
  Landmark,
  ShoppingCart,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type EventCategory = "trade" | "alert" | "dividend" | "event";

interface TimelineEvent {
  id: string;
  category: EventCategory;
  type: string;
  title: string;
  description: string;
  detail: string;
  symbol?: string;
  amount?: number;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

type FilterValue = "all" | EventCategory;
type ZoomValue = "7d" | "30d" | "all";

/* ------------------------------------------------------------------ */
/* Mock data generator                                                 */
/* ------------------------------------------------------------------ */

function generateMockEvents(): TimelineEvent[] {
  const now = new Date();
  const events: TimelineEvent[] = [];
  let id = 0;

  const makeDate = (daysAgo: number, hoursAgo: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    return d;
  };

  /* Trades */
  const trades: Omit<TimelineEvent, "id">[] = [
    {
      category: "trade", type: "buy", title: "Bought NVDA", symbol: "NVDA",
      description: "Purchased 50 shares at $892.45",
      detail: "Market order filled. Total cost: $44,622.50. Added to AI/ML portfolio bucket. Position now 150 shares with avg cost basis of $745.30. This buy was triggered by the breakout above the 50-day moving average with strong volume confirmation.",
      amount: -44622.5, timestamp: makeDate(0, 3),
      icon: <ShoppingCart size={16} />, color: "#22c55e",
    },
    {
      category: "trade", type: "sell", title: "Sold INTC", symbol: "INTC",
      description: "Sold 200 shares at $22.45",
      detail: "Limit order filled at target price. Total proceeds: $4,490.00. Realized P&L: -$1,210.00 (-21.2%). Position closed entirely. The stop-loss was hit after continued downward pressure following weak guidance.",
      amount: 4490, timestamp: makeDate(1, 5),
      icon: <ArrowDownRight size={16} />, color: "#ef4444",
    },
    {
      category: "trade", type: "buy", title: "Bought AAPL", symbol: "AAPL",
      description: "Purchased 30 shares at $234.56",
      detail: "Limit order filled. Total cost: $7,036.80. Added to core holdings. Position now 100 shares with avg cost basis of $198.40. Bought on the pullback to the 200-day moving average support.",
      amount: -7036.8, timestamp: makeDate(3, 2),
      icon: <ShoppingCart size={16} />, color: "#22c55e",
    },
    {
      category: "trade", type: "sell", title: "Sold TSLA (partial)", symbol: "TSLA",
      description: "Sold 25 shares at $312.88",
      detail: "Market order filled. Total proceeds: $7,822.00. Realized P&L: +$2,347.00 (+42.8%). Trimmed position by 25% after reaching overbought RSI levels. Remaining 75 shares retained.",
      amount: 7822, timestamp: makeDate(5, 8),
      icon: <ArrowUpRight size={16} />, color: "#f59e0b",
    },
    {
      category: "trade", type: "buy", title: "Bought MSFT", symbol: "MSFT",
      description: "Purchased 20 shares at $445.12",
      detail: "Limit order filled. Total cost: $8,902.40. New position initiated based on AI copilot recommendation. Entry triggered by earnings beat and Azure revenue acceleration.",
      amount: -8902.4, timestamp: makeDate(8, 4),
      icon: <ShoppingCart size={16} />, color: "#22c55e",
    },
    {
      category: "trade", type: "buy", title: "Bought AMZN", symbol: "AMZN",
      description: "Purchased 15 shares at $189.30",
      detail: "DCA order filled. Total cost: $2,839.50. Monthly dollar-cost averaging into AMZN. Position now 60 shares, avg cost basis $172.45.",
      amount: -2839.5, timestamp: makeDate(12, 6),
      icon: <ShoppingCart size={16} />, color: "#22c55e",
    },
    {
      category: "trade", type: "sell", title: "Sold META", symbol: "META",
      description: "Sold 40 shares at $512.30",
      detail: "Trailing stop triggered at $512.30. Total proceeds: $20,492.00. Realized P&L: +$8,212.00 (+66.8%). Full position closed after trailing stop was hit following pullback from all-time highs.",
      amount: 20492, timestamp: makeDate(18, 1),
      icon: <ArrowUpRight size={16} />, color: "#f59e0b",
    },
    {
      category: "trade", type: "buy", title: "Bought GOOG", symbol: "GOOG",
      description: "Purchased 25 shares at $178.92",
      detail: "Market order filled. Total cost: $4,473.00. Added exposure to Google Cloud growth story. Position now 50 shares.",
      amount: -4473, timestamp: makeDate(22, 3),
      icon: <ShoppingCart size={16} />, color: "#22c55e",
    },
  ];

  /* Alerts */
  const alerts: Omit<TimelineEvent, "id">[] = [
    {
      category: "alert", type: "price_alert", title: "NVDA broke $900 resistance", symbol: "NVDA",
      description: "Price crossed above $900 level",
      detail: "NVDA reached $905.23, breaking through the $900 psychological resistance level. This was the third test of this level in the past month. Volume was 2.3x the 20-day average, confirming the breakout. Consider adding to position or setting a new alert at $950.",
      timestamp: makeDate(0, 6),
      icon: <TrendingUp size={16} />, color: "#3b82f6",
    },
    {
      category: "alert", type: "volume_spike", title: "TSLA volume spike +340%", symbol: "TSLA",
      description: "Unusual trading volume detected",
      detail: "TSLA saw 340% above-average volume in the last hour. 28.4M shares traded vs. 8.3M average. Price moved +4.2% during the spike. This coincides with reports of a new factory announcement. Historically, volume spikes of this magnitude lead to continued momentum 68% of the time.",
      timestamp: makeDate(1, 2),
      icon: <BarChart3 size={16} />, color: "#f59e0b",
    },
    {
      category: "alert", type: "rsi_alert", title: "AAPL RSI entered oversold", symbol: "AAPL",
      description: "RSI dropped below 30 (currently 27.4)",
      detail: "AAPL's 14-day RSI has fallen to 27.4, entering oversold territory. The stock has declined 8.3% over the past 5 sessions. Historically, when AAPL's RSI drops below 30, it has bounced an average of 6.2% within the next 10 trading days (78% hit rate). Consider this a potential buying opportunity.",
      timestamp: makeDate(4, 8),
      icon: <Target size={16} />, color: "#8b5cf6",
    },
    {
      category: "alert", type: "price_alert", title: "AMZN hit stop-loss level", symbol: "AMZN",
      description: "Price dropped to $182.00 stop-loss",
      detail: "AMZN touched the $182.00 stop-loss level you set. The stock is currently at $181.85, down 3.2% today. The stop-loss order was not triggered as it was set to alert-only mode. Review your position and decide whether to hold or close manually.",
      timestamp: makeDate(9, 4),
      icon: <AlertTriangle size={16} />, color: "#ef4444",
    },
    {
      category: "alert", type: "custom_alert", title: "Portfolio drawdown warning", symbol: undefined,
      description: "Portfolio down 3.5% from peak",
      detail: "Your portfolio has experienced a 3.5% drawdown from its recent high of $294,230. Current value: $283,930. Your max drawdown tolerance is set at 5%. If the drawdown continues to 4.5%, the system will recommend reducing position sizes. Consider reviewing your highest-risk positions.",
      timestamp: makeDate(14, 1),
      icon: <Bell size={16} />, color: "#ef4444",
    },
    {
      category: "alert", type: "earnings_alert", title: "MSFT earnings in 2 days", symbol: "MSFT",
      description: "Earnings report approaching",
      detail: "Microsoft reports Q2 FY2026 earnings in 2 days (after market close). Consensus: EPS $3.22, Revenue $68.7B. Your position: 20 shares ($8,902 value). Options implied move: +/- 5.8%. Consider whether to hold through earnings or hedge with options.",
      timestamp: makeDate(20, 6),
      icon: <Calendar size={16} />, color: "#f59e0b",
    },
  ];

  /* Dividends */
  const dividends: Omit<TimelineEvent, "id">[] = [
    {
      category: "dividend", type: "dividend_paid", title: "AAPL dividend received", symbol: "AAPL",
      description: "$0.25/share - Total: $25.00",
      detail: "Quarterly dividend payment of $0.25 per share received for 100 shares of AAPL. Total payment: $25.00. This is AAPL's regular quarterly dividend, yielding approximately 0.43% annually. Dividend automatically reinvested per your DRIP settings.",
      amount: 25, timestamp: makeDate(2, 0),
      icon: <DollarSign size={16} />, color: "#22c55e",
    },
    {
      category: "dividend", type: "dividend_paid", title: "MSFT dividend received", symbol: "MSFT",
      description: "$0.75/share - Total: $15.00",
      detail: "Quarterly dividend payment of $0.75 per share received for 20 shares of MSFT. Total payment: $15.00. Microsoft has increased its dividend for 19 consecutive years. Current yield: 0.67%. Cash deposited to account.",
      amount: 15, timestamp: makeDate(7, 0),
      icon: <DollarSign size={16} />, color: "#22c55e",
    },
    {
      category: "dividend", type: "dividend_paid", title: "JPM dividend received", symbol: "JPM",
      description: "$1.15/share - Total: $57.50",
      detail: "Quarterly dividend payment of $1.15 per share received for 50 shares of JPM. Total payment: $57.50. JPMorgan recently announced a 5% dividend increase. Current yield: 2.1%. Cash deposited to account.",
      amount: 57.5, timestamp: makeDate(15, 0),
      icon: <DollarSign size={16} />, color: "#22c55e",
    },
    {
      category: "dividend", type: "ex_dividend", title: "KO ex-dividend date", symbol: "KO",
      description: "Ex-dividend date - $0.485/share",
      detail: "Coca-Cola (KO) goes ex-dividend today. You hold 80 shares and will receive $38.80 on the payment date of March 15. KO is a Dividend Aristocrat with 62 consecutive years of dividend increases. Consider whether to buy more before ex-date.",
      amount: 38.8, timestamp: makeDate(25, 0),
      icon: <Landmark size={16} />, color: "#06b6d4",
    },
  ];

  /* Market events */
  const marketEvents: Omit<TimelineEvent, "id">[] = [
    {
      category: "event", type: "earnings", title: "NVDA Q4 earnings beat", symbol: "NVDA",
      description: "EPS $5.16 vs $4.60 est. Revenue $22.1B vs $20.4B est.",
      detail: "NVIDIA reported Q4 earnings that crushed expectations. Data center revenue grew 409% YoY to $18.4B. Gaming revenue up 56% to $2.9B. The company guided Q1 revenue to $24B (+/- 2%), above consensus of $22.1B. Stock moved +8.4% in after-hours trading. Your position gained approximately $3,780.",
      timestamp: makeDate(6, 0),
      icon: <Star size={16} />, color: "#f59e0b",
    },
    {
      category: "event", type: "fed_decision", title: "Fed holds rates steady", symbol: undefined,
      description: "Federal Funds Rate unchanged at 4.25-4.50%",
      detail: "The Federal Reserve voted unanimously to hold interest rates at 4.25-4.50%. Powell's press conference signaled that the committee is monitoring inflation data closely and that rate cuts remain on the table for later in 2026. Markets rallied after the announcement, with the S&P 500 gaining 1.2%.",
      timestamp: makeDate(10, 0),
      icon: <Landmark size={16} />, color: "#8b5cf6",
    },
    {
      category: "event", type: "market_milestone", title: "S&P 500 hits new all-time high", symbol: undefined,
      description: "Index closed at 5,824.10",
      detail: "The S&P 500 reached a new all-time high of 5,824.10, surpassing the previous record of 5,801.45 set in January. The rally was led by technology and healthcare sectors. Your portfolio, which has a 0.87 beta to the S&P 500, gained 0.38% on the day.",
      timestamp: makeDate(16, 0),
      icon: <Award size={16} />, color: "#22c55e",
    },
    {
      category: "event", type: "split", title: "NVDA 10:1 stock split effective", symbol: "NVDA",
      description: "Share count multiplied by 10, price adjusted",
      detail: "NVIDIA's 10-for-1 stock split is now effective. Your 15 shares are now 150 shares. Share price adjusted from $1,200.45 to $120.05. Your total position value remains unchanged at $18,006.75. Cost basis per share has been adjusted automatically.",
      timestamp: makeDate(28, 0),
      icon: <Zap size={16} />, color: "#f59e0b",
    },
    {
      category: "event", type: "sector_rotation", title: "Major sector rotation detected", symbol: undefined,
      description: "Funds flowing from Tech to Financials/Energy",
      detail: "Our algorithms detected a significant sector rotation over the past 5 trading sessions. Technology ETFs saw $4.2B in outflows while Financials received $2.8B and Energy received $1.6B in inflows. This rotation pattern historically lasts 2-4 weeks. Consider rebalancing your portfolio allocation.",
      timestamp: makeDate(35, 0),
      icon: <TrendingDown size={16} />, color: "#ef4444",
    },
    {
      category: "event", type: "ipo", title: "Watched IPO: Stripe (STRP)", symbol: "STRP",
      description: "Stripe IPO priced at $70/share",
      detail: "Stripe priced its IPO at $70 per share, valuing the company at $95B. The stock opened at $82.40 (+17.7%) and closed the first day at $79.15. The company reported $18.6B in revenue for 2025. This was on your IPO watchlist. Consider whether to initiate a position after the lock-up period.",
      timestamp: makeDate(40, 0),
      icon: <Star size={16} />, color: "#06b6d4",
    },
  ];

  const allRaw = [...trades, ...alerts, ...dividends, ...marketEvents];
  allRaw.forEach((e) => {
    events.push({ ...e, id: `evt-${id++}` } as TimelineEvent);
  });

  /* Sort newest first */
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return events;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = diffMs / (1000 * 60 * 60 * 24);

  if (diffH < 1) return `${Math.round(diffMs / (1000 * 60))}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  if (diffD < 7) return `${Math.round(diffD)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const CATEGORY_LABELS: Record<FilterValue, string> = {
  all: "All",
  trade: "Trades",
  alert: "Alerts",
  dividend: "Dividends",
  event: "Events",
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  trade: "#22c55e",
  alert: "#3b82f6",
  dividend: "#f59e0b",
  event: "#8b5cf6",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PortfolioTimeline() {
  const allEvents = useMemo(() => generateMockEvents(), []);

  const [filter, setFilter] = useState<FilterValue>("all");
  const [zoom, setZoom] = useState<ZoomValue>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* Filtered events */
  const filteredEvents = useMemo(() => {
    let evts = allEvents;

    /* Category filter */
    if (filter !== "all") {
      evts = evts.filter((e) => e.category === filter);
    }

    /* Zoom filter */
    if (zoom !== "all") {
      const now = new Date();
      const cutoff = new Date(now);
      if (zoom === "7d") cutoff.setDate(cutoff.getDate() - 7);
      else if (zoom === "30d") cutoff.setDate(cutoff.getDate() - 30);
      evts = evts.filter((e) => e.timestamp >= cutoff);
    }

    return evts;
  }, [allEvents, filter, zoom]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filter bar */}
      <div
        className="timeline-filter-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Filter size={14} style={{ opacity: 0.5 }} />

        {(Object.keys(CATEGORY_LABELS) as FilterValue[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: `1px solid ${filter === f ? "var(--surface-border-strong)" : "var(--surface-border)"}`,
              background: filter === f ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: filter === f ? 600 : 400,
              color: filter === f ? "var(--accent)" : "inherit",
            }}
          >
            {CATEGORY_LABELS[f]}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Zoom buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { value: "7d" as ZoomValue, label: "7D" },
            { value: "30d" as ZoomValue, label: "30D" },
            { value: "all" as ZoomValue, label: "All" },
          ]).map((z) => (
            <button
              key={z.value}
              onClick={() => setZoom(z.value)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: `1px solid ${zoom === z.value ? "var(--surface-border-strong)" : "var(--surface-border)"}`,
                background: zoom === z.value ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: zoom === z.value ? 600 : 400,
              }}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div
        className="timeline-container"
        style={{ position: "relative", paddingLeft: 32 }}
      >
        {/* Vertical line */}
        <div
          className="timeline-line"
          style={{
            position: "absolute",
            left: 11,
            top: 0,
            bottom: 0,
            width: 2,
            background: "var(--surface-border)",
            borderRadius: 1,
          }}
        />

        {filteredEvents.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center", opacity: 0.5, fontSize: 14 }}>
            No events match the current filters.
          </div>
        )}

        {filteredEvents.map((event) => {
          const isExpanded = expandedId === event.id;
          const dotColor = CATEGORY_COLORS[event.category];

          return (
            <div
              key={event.id}
              className="timeline-event"
              style={{
                position: "relative",
                marginBottom: 16,
              }}
            >
              {/* Dot */}
              <div
                className="timeline-dot"
                style={{
                  position: "absolute",
                  left: -27,
                  top: 14,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: dotColor,
                  border: "3px solid var(--bg-canvas)",
                  zIndex: 2,
                  boxShadow: `0 0 0 2px ${dotColor}40`,
                }}
              />

              {/* Card */}
              <div
                className="timeline-card"
                onClick={() => toggleExpand(event.id)}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${isExpanded ? `${dotColor}40` : "var(--surface-border)"}`,
                  background: isExpanded ? `${dotColor}08` : "var(--surface)",
                  cursor: "pointer",
                  overflow: "hidden",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 14px",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `${dotColor}15`,
                      color: dotColor,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {event.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="timeline-title"
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>{event.title}</span>
                      {event.symbol && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "var(--surface-emphasis)",
                          }}
                        >
                          {event.symbol}
                        </span>
                      )}
                    </div>

                    <div
                      className="timeline-desc"
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {event.description}
                    </div>

                    <div
                      className="timeline-date"
                      style={{
                        fontSize: 11,
                        opacity: 0.45,
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={10} />
                      {formatDate(event.timestamp)}
                      {event.amount !== undefined && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontWeight: 600,
                            color: event.amount >= 0 ? "var(--positive)" : "var(--negative)",
                          }}
                        >
                          {event.amount >= 0 ? "+" : ""}${Math.abs(event.amount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand chevron */}
                  <div style={{ opacity: 0.4, marginTop: 4, flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 14px 14px 56px",
                      borderTop: "1px solid var(--surface-border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.6,
                        opacity: 0.8,
                        paddingTop: 10,
                      }}
                    >
                      {event.detail}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.4,
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Calendar size={10} />
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "8px 0",
          fontSize: 11,
          opacity: 0.5,
        }}
      >
        <span>{filteredEvents.length} events shown</span>
        <span>{allEvents.length} total events</span>
      </div>
    </div>
  );
}
