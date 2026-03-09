export type SectorInfo = {
  sector: string;
  color: string;
  symbols: { symbol: string; name: string; weight: number }[];
};

export const SECTORS: SectorInfo[] = [
  {
    sector: "Technology",
    color: "#6366f1",
    symbols: [
      { symbol: "AAPL", name: "Apple", weight: 7.5 },
      { symbol: "MSFT", name: "Microsoft", weight: 7.2 },
      { symbol: "NVDA", name: "NVIDIA", weight: 6.8 },
      { symbol: "AVGO", name: "Broadcom", weight: 2.1 },
      { symbol: "CRM", name: "Salesforce", weight: 0.8 },
    ],
  },
  {
    sector: "Consumer Discretionary",
    color: "#f59e0b",
    symbols: [
      { symbol: "AMZN", name: "Amazon", weight: 4.2 },
      { symbol: "TSLA", name: "Tesla", weight: 2.1 },
      { symbol: "HD", name: "Home Depot", weight: 1.0 },
      { symbol: "NKE", name: "Nike", weight: 0.5 },
    ],
  },
  {
    sector: "Communication Services",
    color: "#3b82f6",
    symbols: [
      { symbol: "META", name: "Meta", weight: 2.8 },
      { symbol: "GOOGL", name: "Alphabet", weight: 4.5 },
      { symbol: "NFLX", name: "Netflix", weight: 0.9 },
      { symbol: "DIS", name: "Disney", weight: 0.6 },
    ],
  },
  {
    sector: "Healthcare",
    color: "#10b981",
    symbols: [
      { symbol: "UNH", name: "UnitedHealth", weight: 1.5 },
      { symbol: "JNJ", name: "Johnson & Johnson", weight: 1.2 },
      { symbol: "LLY", name: "Eli Lilly", weight: 1.8 },
      { symbol: "PFE", name: "Pfizer", weight: 0.5 },
      { symbol: "ABBV", name: "AbbVie", weight: 0.9 },
    ],
  },
  {
    sector: "Financials",
    color: "#8b5cf6",
    symbols: [
      { symbol: "JPM", name: "JPMorgan", weight: 1.8 },
      { symbol: "V", name: "Visa", weight: 1.3 },
      { symbol: "MA", name: "Mastercard", weight: 1.1 },
      { symbol: "BAC", name: "Bank of America", weight: 0.9 },
      { symbol: "GS", name: "Goldman Sachs", weight: 0.5 },
    ],
  },
  {
    sector: "Industrials",
    color: "#64748b",
    symbols: [
      { symbol: "CAT", name: "Caterpillar", weight: 0.6 },
      { symbol: "GE", name: "GE Aerospace", weight: 0.5 },
      { symbol: "UPS", name: "UPS", weight: 0.4 },
      { symbol: "HON", name: "Honeywell", weight: 0.4 },
    ],
  },
  {
    sector: "Consumer Staples",
    color: "#22c55e",
    symbols: [
      { symbol: "PG", name: "Procter & Gamble", weight: 1.0 },
      { symbol: "KO", name: "Coca-Cola", weight: 0.8 },
      { symbol: "PEP", name: "PepsiCo", weight: 0.7 },
      { symbol: "COST", name: "Costco", weight: 0.9 },
    ],
  },
  {
    sector: "Energy",
    color: "#ef4444",
    symbols: [
      { symbol: "XOM", name: "Exxon Mobil", weight: 1.3 },
      { symbol: "CVX", name: "Chevron", weight: 0.9 },
      { symbol: "COP", name: "ConocoPhillips", weight: 0.4 },
    ],
  },
  {
    sector: "Utilities",
    color: "#06b6d4",
    symbols: [
      { symbol: "NEE", name: "NextEra Energy", weight: 0.5 },
      { symbol: "DUK", name: "Duke Energy", weight: 0.3 },
    ],
  },
  {
    sector: "Real Estate",
    color: "#a855f7",
    symbols: [
      { symbol: "AMT", name: "American Tower", weight: 0.3 },
      { symbol: "PLD", name: "Prologis", weight: 0.3 },
    ],
  },
  {
    sector: "Materials",
    color: "#d97706",
    symbols: [
      { symbol: "LIN", name: "Linde", weight: 0.5 },
      { symbol: "APD", name: "Air Products", weight: 0.2 },
    ],
  },
];

export function getSectorForSymbol(symbol: string): string | null {
  for (const s of SECTORS) {
    if (s.symbols.some((x) => x.symbol === symbol)) return s.sector;
  }
  return null;
}

export function getSectorColor(sector: string): string {
  return SECTORS.find((s) => s.sector === sector)?.color || "#64748b";
}
