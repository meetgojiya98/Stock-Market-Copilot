"use client";

/* ─── Crypto Market Data ─── */

export type CryptoAsset = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
};

const CRYPTO_LIST: {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}[] = [
  { symbol: "BTC", name: "Bitcoin", price: 67432.18, change24h: 2.34, marketCap: 1_324_000_000_000, volume24h: 32_500_000_000 },
  { symbol: "ETH", name: "Ethereum", price: 3521.47, change24h: 1.87, marketCap: 423_000_000_000, volume24h: 18_200_000_000 },
  { symbol: "SOL", name: "Solana", price: 148.92, change24h: 5.12, marketCap: 65_200_000_000, volume24h: 3_800_000_000 },
  { symbol: "BNB", name: "BNB", price: 598.34, change24h: 0.45, marketCap: 92_100_000_000, volume24h: 1_950_000_000 },
  { symbol: "XRP", name: "XRP", price: 0.6234, change24h: -1.23, marketCap: 34_100_000_000, volume24h: 1_420_000_000 },
  { symbol: "ADA", name: "Cardano", price: 0.4512, change24h: -0.87, marketCap: 15_900_000_000, volume24h: 520_000_000 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.1234, change24h: 3.45, marketCap: 17_600_000_000, volume24h: 1_100_000_000 },
  { symbol: "DOT", name: "Polkadot", price: 7.45, change24h: -2.15, marketCap: 9_800_000_000, volume24h: 340_000_000 },
  { symbol: "AVAX", name: "Avalanche", price: 35.67, change24h: 4.23, marketCap: 13_400_000_000, volume24h: 620_000_000 },
  { symbol: "MATIC", name: "Polygon", price: 0.7823, change24h: -0.56, marketCap: 7_200_000_000, volume24h: 410_000_000 },
  { symbol: "LINK", name: "Chainlink", price: 14.89, change24h: 1.92, marketCap: 8_700_000_000, volume24h: 580_000_000 },
  { symbol: "UNI", name: "Uniswap", price: 7.12, change24h: -1.45, marketCap: 4_300_000_000, volume24h: 210_000_000 },
  { symbol: "ATOM", name: "Cosmos", price: 9.34, change24h: 0.78, marketCap: 3_600_000_000, volume24h: 180_000_000 },
  { symbol: "LTC", name: "Litecoin", price: 72.45, change24h: -0.34, marketCap: 5_400_000_000, volume24h: 390_000_000 },
  { symbol: "FIL", name: "Filecoin", price: 5.67, change24h: 2.89, marketCap: 2_800_000_000, volume24h: 160_000_000 },
  { symbol: "APT", name: "Aptos", price: 8.92, change24h: 3.67, marketCap: 3_200_000_000, volume24h: 190_000_000 },
  { symbol: "ARB", name: "Arbitrum", price: 1.12, change24h: -3.21, marketCap: 2_500_000_000, volume24h: 420_000_000 },
  { symbol: "OP", name: "Optimism", price: 2.34, change24h: 1.56, marketCap: 2_100_000_000, volume24h: 280_000_000 },
  { symbol: "NEAR", name: "NEAR Protocol", price: 5.23, change24h: 4.89, marketCap: 5_100_000_000, volume24h: 350_000_000 },
  { symbol: "INJ", name: "Injective", price: 24.56, change24h: 6.12, marketCap: 2_300_000_000, volume24h: 270_000_000 },
];

export function getMockCryptoData(): CryptoAsset[] {
  return CRYPTO_LIST.map((c, i) => ({
    ...c,
    rank: i + 1,
  }));
}

export function formatCryptoPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  if (price >= 0.01) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

export function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
}
