import React, { useState } from "react";

// 1. Type definitions
type Stock = {
  symbol: string;
  name: string;
};

type SearchBarProps = {
  stocks: Stock[];
  onSelect: (symbol: string) => void;
};

export default function SearchBar({ stocks, onSelect }: SearchBarProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Stock[]>([]); // <-- Also add type here

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toUpperCase();
    setQ(value);
    if (value.length > 0 && Array.isArray(stocks)) {
      setResults(
        stocks
          .filter(
            (stock) =>
              stock.symbol.toLowerCase().startsWith(value.toLowerCase()) ||
              stock.name.toLowerCase().includes(value.toLowerCase())
          )
          .slice(0, 10)
      );
    } else {
      setResults([]);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search stocks (AAPL, TSLA...)"
        value={q}
        onChange={handleChange}
        className="border px-2 py-1 rounded w-full sm:w-auto sm:min-w-[220px] dark:bg-zinc-900 dark:text-white"
      />
      {results.length > 0 && (
        <div className="absolute z-10 bg-white dark:bg-zinc-900 shadow rounded w-full mt-1">
          {results.map((stock) => (
            <div
              key={stock.symbol}
              className="px-3 py-2 cursor-pointer hover:bg-orange-100 dark:hover:bg-zinc-800"
              onClick={() => {
                onSelect(stock.symbol);
                setQ("");
                setResults([]);
              }}
            >
              <span className="font-mono">{stock.symbol}</span> - {stock.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
