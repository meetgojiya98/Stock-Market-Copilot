"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  RotateCcw,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccentColor {
  name: string;
  /** primary accent value */
  value: string;
  /** complementary shade (lighter) */
  value2: string;
  /** complementary shade (darker / muted) */
  value3: string;
}

/* ------------------------------------------------------------------ */
/*  Accent palette                                                     */
/* ------------------------------------------------------------------ */

const ACCENTS: AccentColor[] = [
  { name: "Blue",    value: "#3b82f6", value2: "#60a5fa", value3: "#1d4ed8" },
  { name: "Indigo",  value: "#3b82f6", value2: "#60a5fa", value3: "#1d4ed8" },
  { name: "Violet",  value: "#3b82f6", value2: "#60a5fa", value3: "#1d4ed8" },
  { name: "Purple",  value: "#a855f7", value2: "#c084fc", value3: "#7e22ce" },
  { name: "Pink",    value: "#ec4899", value2: "#f472b6", value3: "#be185d" },
  { name: "Rose",    value: "#f43f5e", value2: "#fb7185", value3: "#be123c" },
  { name: "Red",     value: "#ef4444", value2: "#f87171", value3: "#b91c1c" },
  { name: "Orange",  value: "#f97316", value2: "#fb923c", value3: "#c2410c" },
  { name: "Amber",   value: "#f59e0b", value2: "#fbbf24", value3: "#b45309" },
  { name: "Emerald", value: "#10b981", value2: "#34d399", value3: "#047857" },
  { name: "Teal",    value: "#14b8a6", value2: "#2dd4bf", value3: "#0f766e" },
  { name: "Cyan",    value: "#06b6d4", value2: "#22d3ee", value3: "#0e7490" },
];

const DEFAULT_ACCENT = ACCENTS[2]; // Violet
const STORAGE_KEY = "smc_accent_color_v1";

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

function loadSaved(): AccentColor | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccentColor;
    if (parsed && parsed.value && parsed.value2 && parsed.value3 && parsed.name) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function persist(color: AccentColor): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(color));
  } catch {
    /* silently ignore quota errors */
  }
}

function applyToDOM(color: AccentColor): void {
  const root = document.documentElement;
  root.style.setProperty("--accent", color.value);
  root.style.setProperty("--accent-2", color.value2);
  root.style.setProperty("--accent-3", color.value3);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ThemeCustomizer() {
  const [selected, setSelected] = useState<AccentColor>(DEFAULT_ACCENT);
  const [expanded, setExpanded] = useState(true);
  const [justApplied, setJustApplied] = useState(false);

  /* ---------- Load saved accent on mount ---------- */

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setSelected(saved);
      applyToDOM(saved);
    } else {
      applyToDOM(DEFAULT_ACCENT);
    }
  }, []);

  /* ---------- Handle swatch click ---------- */

  const selectColor = useCallback((color: AccentColor) => {
    setSelected(color);
    applyToDOM(color);
    persist(color);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 1200);
  }, []);

  /* ---------- Reset ---------- */

  const resetToDefault = useCallback(() => {
    setSelected(DEFAULT_ACCENT);
    applyToDOM(DEFAULT_ACCENT);
    persist(DEFAULT_ACCENT);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 1200);
  }, []);

  /* ---------- Is a color the currently selected one? ---------- */

  const isSelected = useCallback(
    (color: AccentColor) => color.value === selected.value,
    [selected]
  );

  /* ---------- Preview colors ---------- */

  const previewColors = useMemo(
    () => [selected.value3, selected.value, selected.value2],
    [selected]
  );

  return (
    <div
      className="theme-customizer"
      style={{
        background: "var(--surface-strong, #1e1e2e)",
        border: "1px solid var(--surface-border, #333)",
        borderRadius: 16,
        padding: 0,
        overflow: "hidden",
        fontFamily: "inherit",
        color: "var(--ink, #e0e0e0)",
        maxWidth: 420,
      }}
    >
      {/* header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        <Palette size={18} style={{ color: selected.value }} />
        <span style={{ flex: 1, textAlign: "left" }}>Theme Accent</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            opacity: 0.5,
            marginRight: 6,
          }}
        >
          {selected.name}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          {/* Live preview strip */}
          <div
            className="theme-preview-strip"
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 18,
              borderRadius: 10,
              overflow: "hidden",
              height: 36,
            }}
          >
            {previewColors.map((c, i) => (
              <div
                key={i}
                className="theme-preview-swatch"
                style={{
                  flex: 1,
                  background: c,
                  transition: "background 0.3s ease",
                  position: "relative",
                }}
              >
                {i === 1 && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      textShadow: "0 1px 3px rgba(0,0,0,.3)",
                      letterSpacing: 0.5,
                    }}
                  >
                    {justApplied ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Sparkles size={12} /> Applied
                      </span>
                    ) : (
                      "PRIMARY"
                    )}
                  </span>
                )}
                {i === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#fff",
                      opacity: 0.7,
                      textShadow: "0 1px 3px rgba(0,0,0,.3)",
                    }}
                  >
                    DARK
                  </span>
                )}
                {i === 2 && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#fff",
                      opacity: 0.7,
                      textShadow: "0 1px 3px rgba(0,0,0,.3)",
                    }}
                  >
                    LIGHT
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Swatch grid */}
          <div
            className="theme-swatch-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {ACCENTS.map((color) => {
              const active = isSelected(color);
              return (
                <button
                  key={color.name}
                  className="theme-swatch"
                  title={color.name}
                  onClick={() => selectColor(color)}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 10,
                    border: active
                      ? `2px solid ${color.value}`
                      : "2px solid transparent",
                    background: color.value,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.15s, border-color 0.2s",
                    transform: active ? "scale(1.1)" : "scale(1)",
                    boxShadow: active
                      ? `0 0 0 3px rgba(255,255,255,0.15), 0 4px 12px ${color.value}66`
                      : "none",
                    position: "relative",
                    outline: "none",
                  }}
                >
                  {active && <Check size={16} color="#fff" strokeWidth={3} />}
                </button>
              );
            })}
          </div>

          {/* Color name labels row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 10,
              marginBottom: 18,
              marginTop: -8,
            }}
          >
            {ACCENTS.map((color) => (
              <span
                key={color.name}
                style={{
                  fontSize: 9,
                  textAlign: "center",
                  opacity: isSelected(color) ? 1 : 0.4,
                  fontWeight: isSelected(color) ? 700 : 400,
                  transition: "opacity 0.2s",
                  letterSpacing: 0.3,
                }}
              >
                {color.name}
              </span>
            ))}
          </div>

          {/* Current values */}
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 12,
              opacity: 0.5,
              marginBottom: 16,
            }}
          >
            <span>
              --accent: <code style={{ fontFamily: "monospace" }}>{selected.value}</code>
            </span>
            <span>
              --accent-2: <code style={{ fontFamily: "monospace" }}>{selected.value2}</code>
            </span>
          </div>

          {/* Reset button */}
          <button
            onClick={resetToDefault}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--surface-border, #444)",
              background: "rgba(255,255,255,0.04)",
              color: "inherit",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.04)";
            }}
          >
            <RotateCcw size={14} />
            Reset to default (Violet)
          </button>
        </div>
      )}
    </div>
  );
}
