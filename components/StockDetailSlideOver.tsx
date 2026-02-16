"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Newspaper,
  Gauge,
  ExternalLink,
  Star,
  Copy,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StockDetailContextType = {
  openSymbol: string | null;
  openStock: (symbol: string) => void;
  closeStock: () => void;
};

type StockData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
  pe: number;
  beta: number;
  divYield: number;
  high52w: number;
  low52w: number;
  avgVolume: string;
  eps: number;
  sector: string;
  sparklineData: number[];
  sentiment: number; // 0-100
  news: { title: string; source: string; time: string; url: string }[];
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const StockDetailContext = createContext<StockDetailContextType>({
  openSymbol: null,
  openStock: () => {},
  closeStock: () => {},
});

export function useStockDetail() {
  return useContext(StockDetailContext);
}

// ---------------------------------------------------------------------------
// Deterministic hash for mock data generation
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Mock data generator
// ---------------------------------------------------------------------------

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla Inc.",
  META: "Meta Platforms Inc.",
  JPM: "JPMorgan Chase & Co.",
  V: "Visa Inc.",
  WMT: "Walmart Inc.",
  JNJ: "Johnson & Johnson",
  PG: "Procter & Gamble Co.",
};

const SECTORS = ["Technology", "Healthcare", "Finance", "Consumer", "Energy", "Industrials"];

function generateStockData(symbol: string): StockData {
  const hash = hashString(symbol);
  const rng = seededRandom(hash);

  const basePrice = 50 + rng() * 900;
  const price = Math.round(basePrice * 100) / 100;
  const changeAbs = Math.round((rng() * 20 - 10) * 100) / 100;
  const changePct = Math.round((changeAbs / price) * 10000) / 100;

  const sparkline: number[] = [];
  let sv = price - changeAbs;
  for (let i = 0; i < 30; i++) {
    sv += (rng() - 0.48) * (price * 0.015);
    sparkline.push(Math.max(sv, price * 0.8));
  }
  sparkline.push(price);

  const volBase = Math.floor(rng() * 80 + 5);
  const mcapBase = Math.floor(rng() * 2500 + 50);

  return {
    symbol,
    name: COMPANY_NAMES[symbol] || `${symbol} Corporation`,
    price,
    change: changeAbs,
    changePct,
    open: Math.round((price - changeAbs * 0.4) * 100) / 100,
    high: Math.round((price + Math.abs(changeAbs) * 0.6 + rng() * 3) * 100) / 100,
    low: Math.round((price - Math.abs(changeAbs) * 0.6 - rng() * 3) * 100) / 100,
    volume: `${volBase}.${Math.floor(rng() * 9)}M`,
    avgVolume: `${Math.floor(volBase * 0.9)}.${Math.floor(rng() * 9)}M`,
    marketCap: mcapBase > 1000 ? `${(mcapBase / 1000).toFixed(2)}T` : `${mcapBase}.${Math.floor(rng() * 9)}B`,
    pe: Math.round((10 + rng() * 45) * 10) / 10,
    beta: Math.round((0.5 + rng() * 1.8) * 100) / 100,
    divYield: Math.round(rng() * 4 * 100) / 100,
    high52w: Math.round((price * (1.05 + rng() * 0.3)) * 100) / 100,
    low52w: Math.round((price * (0.55 + rng() * 0.25)) * 100) / 100,
    eps: Math.round((2 + rng() * 25) * 100) / 100,
    sector: SECTORS[hash % SECTORS.length],
    sparklineData: sparkline,
    sentiment: Math.floor(rng() * 100),
    news: [
      {
        title: `${symbol} reports strong quarterly earnings, beats analyst estimates`,
        source: "Reuters",
        time: "2h ago",
        url: "#",
      },
      {
        title: `Analysts upgrade ${symbol} following product announcement`,
        source: "Bloomberg",
        time: "5h ago",
        url: "#",
      },
      {
        title: `${symbol} expands operations in key growth market`,
        source: "CNBC",
        time: "1d ago",
        url: "#",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// SVG Sparkline
// ---------------------------------------------------------------------------

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const w = 320;
  const h = 100;
  const padding = 4;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = padding + (h - padding * 2) - ((v - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const color = positive ? "var(--positive)" : "var(--negative)";
  const gradId = "slide-sparkline-grad";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 100, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${padding},${h - padding} ${polyline} ${w - padding},${h - padding}`} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={w - padding}
          cy={padding + (h - padding * 2) - ((data[data.length - 1] - min) / range) * (h - padding * 2)}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sentiment Gauge
// ---------------------------------------------------------------------------

function SentimentGauge({ value }: { value: number }) {
  const angle = -90 + (value / 100) * 180;
  const label = value >= 70 ? "Bullish" : value >= 45 ? "Neutral" : "Bearish";
  const color = value >= 70 ? "var(--positive)" : value >= 45 ? "var(--warning)" : "var(--negative)";

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <svg viewBox="0 0 200 120" style={{ width: 180, height: 110 }}>
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--surface-border)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Colored sections */}
        <path
          d="M 20 100 A 80 80 0 0 1 66 32"
          fill="none"
          stroke="var(--negative)"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M 72 28 A 80 80 0 0 1 128 28"
          fill="none"
          stroke="var(--warning)"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M 134 32 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--positive)"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.4"
        />
        {/* Needle */}
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 60 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill={color} />
        {/* Value */}
        <text x="100" y="90" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--ink)">
          {value}
        </text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: -8 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>Market Sentiment Score</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat grid item
// ---------------------------------------------------------------------------

function StatItem({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "var(--bg-soft)",
        borderRadius: 8,
        border: "1px solid var(--surface-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-muted)", marginBottom: 4 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slide-over panel content
// ---------------------------------------------------------------------------

function SlideOverContent({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const data = useMemo(() => generateStockData(symbol), [symbol]);
  const positive = data.change >= 0;
  const [copied, setCopied] = useState(false);
  const [starred, setStarred] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(data.symbol).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [data.symbol]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        className="slide-over-header"
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--surface-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{data.symbol}</span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "var(--bg-deep)",
                color: "var(--ink-muted)",
                fontWeight: 600,
              }}
            >
              {data.sector}
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-muted)",
                padding: 2,
                display: "flex",
              }}
              title="Copy symbol"
            >
              {copied ? <Check size={14} color="var(--positive)" /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => setStarred(!starred)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: starred ? "var(--warning)" : "var(--ink-muted)",
                padding: 2,
                display: "flex",
              }}
            >
              <Star size={14} fill={starred ? "var(--warning)" : "none"} />
            </button>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>{data.name}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-muted)",
            padding: 4,
            borderRadius: 6,
            display: "flex",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
        {/* Price section */}
        <div className="slide-over-price" style={{ padding: "16px 0 12px" }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
            ${data.price.toFixed(2)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
              color: positive ? "var(--positive)" : "var(--negative)",
              marginTop: 2,
            }}
          >
            {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {positive ? "+" : ""}
            {data.change.toFixed(2)} ({positive ? "+" : ""}
            {data.changePct.toFixed(2)}%)
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
            Open: ${data.open.toFixed(2)} &middot; High: ${data.high.toFixed(2)} &middot; Low: ${data.low.toFixed(2)}
          </div>
        </div>

        {/* Mini chart */}
        <div
          className="slide-over-section"
          style={{
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--surface-border)",
            marginBottom: 16,
          }}
        >
          <MiniSparkline data={data.sparklineData} positive={positive} />
        </div>

        {/* Key Stats */}
        <div className="slide-over-section" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Key Statistics</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <StatItem label="P/E Ratio" value={data.pe.toFixed(1)} icon={<BarChart3 size={11} />} />
            <StatItem label="Market Cap" value={data.marketCap} icon={<DollarSign size={11} />} />
            <StatItem label="Volume" value={data.volume} icon={<Activity size={11} />} />
            <StatItem label="Avg Volume" value={data.avgVolume} icon={<Activity size={11} />} />
            <StatItem label="52W High" value={`$${data.high52w.toFixed(2)}`} icon={<TrendingUp size={11} />} />
            <StatItem label="52W Low" value={`$${data.low52w.toFixed(2)}`} icon={<TrendingDown size={11} />} />
            <StatItem label="Beta" value={data.beta.toFixed(2)} icon={<Gauge size={11} />} />
            <StatItem label="Div Yield" value={`${data.divYield.toFixed(2)}%`} icon={<DollarSign size={11} />} />
            <StatItem label="EPS" value={`$${data.eps.toFixed(2)}`} icon={<DollarSign size={11} />} />
            <StatItem label="Sector" value={data.sector} icon={<BarChart3 size={11} />} />
          </div>
        </div>

        {/* Recent News */}
        <div className="slide-over-section" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recent News</div>
          {data.news.map((n, i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderBottom: i < data.news.length - 1 ? "1px solid var(--surface-border)" : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, marginBottom: 3 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                    {n.source} &middot; {n.time}
                  </div>
                </div>
                <ExternalLink size={13} style={{ color: "var(--ink-muted)", flexShrink: 0, marginTop: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Sentiment Gauge */}
        <div className="slide-over-section" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Sentiment Analysis</div>
          <div
            style={{
              background: "var(--bg-soft)",
              borderRadius: 10,
              border: "1px solid var(--surface-border)",
              padding: 12,
            }}
          >
            <SentimentGauge value={data.sentiment} />
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 8, paddingBottom: 8 }}>
          <button
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "var(--positive)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Buy
          </button>
          <button
            style={{
              flex: 1,
              padding: "10px 16px",
              background: "var(--negative)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sell
          </button>
          <button
            style={{
              padding: "10px 16px",
              background: "var(--bg-soft)",
              color: "var(--ink)",
              border: "1px solid var(--surface-border)",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Add to Watchlist
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function StockDetailProvider({ children }: { children: ReactNode }) {
  const [openSymbol, setOpenSymbol] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closingRef = useRef(false);

  const openStock = useCallback((symbol: string) => {
    closingRef.current = false;
    setOpenSymbol(symbol);
    setIsVisible(true);
    // Trigger animation after mount
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
  }, []);

  const closeStock = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsAnimating(false);
    setTimeout(() => {
      setOpenSymbol(null);
      setIsVisible(false);
      closingRef.current = false;
    }, 300);
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!openSymbol) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStock();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openSymbol, closeStock]);

  const ctx = useMemo(
    () => ({ openSymbol, openStock, closeStock }),
    [openSymbol, openStock, closeStock]
  );

  return (
    <StockDetailContext.Provider value={ctx}>
      {children}
      {isVisible && (
        <>
          {/* Backdrop */}
          <div
            className="slide-over-backdrop"
            onClick={closeStock}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              zIndex: 9998,
              opacity: isAnimating ? 1 : 0,
              transition: "opacity 0.3s ease",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* Panel */}
          <div
            className="slide-over-panel"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(440px, 90vw)",
              background: "var(--surface-strong)",
              zIndex: 9999,
              boxShadow: "var(--shadow-xl)",
              borderLeft: "1px solid var(--surface-border)",
              transform: isAnimating ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {openSymbol && <SlideOverContent symbol={openSymbol} onClose={closeStock} />}
          </div>
        </>
      )}
    </StockDetailContext.Provider>
  );
}

export default StockDetailProvider;
