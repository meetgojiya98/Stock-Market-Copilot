"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

const POPULAR_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
  "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "NFLX",
  "PYPL", "ADBE", "CRM", "INTC", "AMD", "QCOM", "COST", "PEP", "KO",
  "ABBV", "MRK", "TMO", "AVGO", "ORCL", "CSCO", "ACN", "TXN", "LLY",
  "NKE", "MCD", "BA", "GS", "MS", "SPY", "QQQ", "IWM", "VTI", "VOO",
];

type SymbolAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SymbolAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search symbol...",
  className = "",
}: SymbolAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const query = value.trim().toUpperCase();
  const suggestions = query.length > 0
    ? POPULAR_SYMBOLS.filter(
        (s) => s.startsWith(query) && s !== query
      ).slice(0, 6)
    : [];

  const hasSuggestions = suggestions.length > 0;

  useEffect(() => {
    setOpen(hasSuggestions);
    setActiveIndex(-1);
  }, [hasSuggestions]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        onSelect(suggestions[activeIndex]);
        setOpen(false);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, suggestions, activeIndex, onSelect]
  );

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div ref={wrapRef} className={`symbol-autocomplete ${className}`}>
      <div className="symbol-autocomplete-input-wrap">
        <Search size={14} className="symbol-autocomplete-icon" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => hasSuggestions && setOpen(true)}
          placeholder={placeholder}
          className="symbol-autocomplete-input"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-label="Stock symbol search"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="symbol-autocomplete-list"
          role="listbox"
          aria-label="Symbol suggestions"
        >
          {suggestions.map((sym, i) => (
            <li
              key={sym}
              role="option"
              aria-selected={i === activeIndex}
              className={`symbol-autocomplete-option ${i === activeIndex ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(sym);
                setOpen(false);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="font-semibold">{sym.slice(0, query.length)}</span>
              <span className="muted">{sym.slice(query.length)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
