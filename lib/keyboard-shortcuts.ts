/* ------------------------------------------------------------------ */
/*  Global Keyboard Shortcuts – Zentrade Stock-Market-Copilot          */
/* ------------------------------------------------------------------ */

export interface Shortcut {
  keys: string;
  description: string;
  /** Either a route path (starts with "/") or a custom-event action name */
  action: string;
  category: "navigation" | "actions";
}

/* ------------------------------------------------------------------ */
/*  Navigation chord map  (G → <key>)                                  */
/* ------------------------------------------------------------------ */

export const NAVIGATION_CHORDS: Record<string, string> = {
  d: "/dashboard",
  t: "/terminal",
  a: "/agents",
  r: "/research",
  p: "/portfolio",
  w: "/watchlist",
  h: "/heatmap",
  b: "/backtest",
  c: "/compare",
  l: "/alerts",
  f: "/workflows",
};

/* ------------------------------------------------------------------ */
/*  Exported shortcuts array for the help modal                        */
/* ------------------------------------------------------------------ */

export const SHORTCUTS: Shortcut[] = [
  // Navigation (G then …)
  { keys: "G then D", description: "Go to Dashboard",  action: "/dashboard",  category: "navigation" },
  { keys: "G then T", description: "Go to Terminal",   action: "/terminal",   category: "navigation" },
  { keys: "G then A", description: "Go to Agents",     action: "/agents",     category: "navigation" },
  { keys: "G then R", description: "Go to Research",   action: "/research",   category: "navigation" },
  { keys: "G then P", description: "Go to Portfolio",  action: "/portfolio",  category: "navigation" },
  { keys: "G then W", description: "Go to Watchlist",  action: "/watchlist",  category: "navigation" },
  { keys: "G then H", description: "Go to Heatmap",    action: "/heatmap",    category: "navigation" },
  { keys: "G then B", description: "Go to Backtest",   action: "/backtest",   category: "navigation" },
  { keys: "G then C", description: "Go to Compare",    action: "/compare",    category: "navigation" },
  { keys: "G then L", description: "Go to Alerts",     action: "/alerts",     category: "navigation" },
  { keys: "G then F", description: "Go to Workflows",  action: "/workflows",  category: "navigation" },

  // Actions
  { keys: "Shift + /", description: "Show keyboard shortcuts", action: "show-shortcuts", category: "actions" },
  { keys: "N",         description: "New chat in terminal",    action: "new-chat",        category: "actions" },
  { keys: "R",         description: "Refresh current data",    action: "refresh",         category: "actions" },
];
