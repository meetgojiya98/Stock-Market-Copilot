"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────────────────────── */

const MATCH_CLASS = "smart-search-match";
const CURRENT_MATCH_STYLE = "outline: 2px solid var(--accent); outline-offset: 1px; border-radius: 2px;";
const DATA_ATTR = "data-smc-search-match";

/* Stock symbol pattern: 1-5 uppercase letters, optionally followed by a dot and letter */
const STOCK_SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;

/* ────────────────────────────────────────────────────────────────────────────
   SmartSearch Component
   ──────────────────────────────────────────────────────────────────────────── */

export default function SmartSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const matchNodesRef = useRef<HTMLElement[]>([]);

  /* ── Open on Ctrl+Shift+F ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+F (or Cmd+Shift+F on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => {
          if (prev) {
            // Closing
            clearHighlights();
            return false;
          }
          return true;
        });
        return;
      }

      // Escape to close
      if (e.key === "Escape" && open) {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open]);

  /* ── Focus input on open ── */
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open]);

  /* ── Perform search when query changes ── */
  useEffect(() => {
    if (!open) return;

    // Debounce the search slightly
    const timer = setTimeout(() => {
      performSearch(query);
    }, 120);

    return () => clearTimeout(timer);
  }, [query, open]);

  /* ── Clear all highlights ── */
  const clearHighlights = useCallback(() => {
    const marks = document.querySelectorAll(`[${DATA_ATTR}]`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        // Replace mark element with its text content
        const textNode = document.createTextNode(mark.textContent || "");
        parent.replaceChild(textNode, mark);
        // Merge adjacent text nodes
        parent.normalize();
      }
    });
    matchNodesRef.current = [];
    setMatchCount(0);
    setCurrentMatch(0);
  }, []);

  /* ── Perform search using TreeWalker ── */
  const performSearch = useCallback(
    (searchQuery: string) => {
      // First clear existing highlights
      clearHighlights();

      const trimmed = searchQuery.trim();
      if (trimmed.length === 0) return;

      // Determine if this looks like a stock symbol search
      const isSymbolSearch = STOCK_SYMBOL_PATTERN.test(trimmed);
      const searchTerm = isSymbolSearch ? trimmed : trimmed.toLowerCase();

      const matches: HTMLElement[] = [];
      const body = document.body;

      // Use TreeWalker to find all text nodes
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          // Skip the search overlay itself
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest(".smart-search-overlay")) return NodeFilter.FILTER_REJECT;

          // Skip script, style, and hidden elements
          const tag = parent.tagName.toLowerCase();
          if (tag === "script" || tag === "style" || tag === "noscript") {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip invisible elements
          const style = window.getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden") {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip already-marked nodes
          if (parent.hasAttribute(DATA_ATTR)) return NodeFilter.FILTER_REJECT;

          const text = node.textContent || "";
          const comparableText = isSymbolSearch ? text : text.toLowerCase();
          if (comparableText.includes(searchTerm)) {
            return NodeFilter.FILTER_ACCEPT;
          }

          return NodeFilter.FILTER_REJECT;
        },
      });

      const textNodes: Text[] = [];
      let currentNode = walker.nextNode();
      while (currentNode) {
        textNodes.push(currentNode as Text);
        currentNode = walker.nextNode();
      }

      // Wrap matches in highlight marks
      for (const textNode of textNodes) {
        const text = textNode.textContent || "";
        const comparableText = isSymbolSearch ? text : text.toLowerCase();
        const parent = textNode.parentNode;
        if (!parent) continue;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let idx = comparableText.indexOf(searchTerm, lastIndex);

        while (idx !== -1) {
          // Add text before match
          if (idx > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
          }

          // Create highlight mark
          const mark = document.createElement("mark");
          mark.className = MATCH_CLASS;
          mark.setAttribute(DATA_ATTR, "true");
          mark.textContent = text.slice(idx, idx + searchTerm.length);
          fragment.appendChild(mark);
          matches.push(mark);

          lastIndex = idx + searchTerm.length;
          idx = comparableText.indexOf(searchTerm, lastIndex);
        }

        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        parent.replaceChild(fragment, textNode);
      }

      matchNodesRef.current = matches;
      setMatchCount(matches.length);

      if (matches.length > 0) {
        setCurrentMatch(1);
        scrollToMatch(matches[0], matches);
      } else {
        setCurrentMatch(0);
      }
    },
    [clearHighlights]
  );

  /* ── Scroll to a specific match ── */
  const scrollToMatch = useCallback(
    (target: HTMLElement, allMatches: HTMLElement[]) => {
      // Remove current styling from all matches
      for (const m of allMatches) {
        m.removeAttribute("style");
      }

      // Style the current match
      target.setAttribute("style", CURRENT_MATCH_STYLE);

      // Scroll into view
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    },
    []
  );

  /* ── Navigate between matches ── */
  const goToMatch = useCallback(
    (direction: "next" | "prev") => {
      const matches = matchNodesRef.current;
      if (matches.length === 0) return;

      let nextIdx: number;
      if (direction === "next") {
        nextIdx = currentMatch >= matches.length ? 1 : currentMatch + 1;
      } else {
        nextIdx = currentMatch <= 1 ? matches.length : currentMatch - 1;
      }

      setCurrentMatch(nextIdx);
      scrollToMatch(matches[nextIdx - 1], matches);
    },
    [currentMatch, scrollToMatch]
  );

  /* ── Close handler ── */
  const handleClose = useCallback(() => {
    clearHighlights();
    setOpen(false);
    setQuery("");
  }, [clearHighlights]);

  /* ── Keyboard navigation in the input ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          goToMatch("prev");
        } else {
          goToMatch("next");
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    },
    [goToMatch, handleClose]
  );

  if (!open) return null;

  return (
    <div className="smart-search-overlay">
      {/* Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.15rem 0.45rem",
          borderBottom: matchCount > 0 || query.trim().length > 0
            ? "1px solid var(--surface-border)"
            : "none",
        }}
      >
        <Search size={14} style={{ color: "var(--ink-muted)", flexShrink: 0 }} />

        <input
          ref={inputRef}
          className="smart-search-input"
          type="text"
          placeholder="Search page content... (stock symbols auto-detected)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Match count */}
        {query.trim().length > 0 && (
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {matchCount > 0 ? `${currentMatch} of ${matchCount}` : "No matches"}
          </span>
        )}

        {/* Navigation buttons */}
        {matchCount > 0 && (
          <div style={{ display: "flex", gap: "0.15rem", flexShrink: 0 }}>
            <button
              onClick={() => goToMatch("prev")}
              aria-label="Previous match"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-muted)",
                padding: "0.15rem",
                borderRadius: "0.2rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => goToMatch("next")}
              aria-label="Next match"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-muted)",
                padding: "0.15rem",
                borderRadius: "0.2rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close search"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-muted)",
            padding: "0.15rem",
            borderRadius: "0.2rem",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
