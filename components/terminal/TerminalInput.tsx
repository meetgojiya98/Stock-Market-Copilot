"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp,
  Slash,
  Search,
  BarChart3,
  Shield,
  Newspaper,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AVAILABLE_COMMANDS } from "./SlashCommandParser";
import VoiceInput from "../VoiceInput";

type Props = {
  onSubmit: (input: string) => void;
  disabled?: boolean;
};

/* ── icon map for commands ───────────────────────────────────── */

const CMD_META: Record<string, { icon: typeof Search; category: string }> = {
  "/scan": { icon: BarChart3, category: "Analysis" },
  "/research": { icon: Search, category: "Analysis" },
  "/guard": { icon: Shield, category: "Portfolio" },
  "/risk": { icon: TrendingUp, category: "Portfolio" },
  "/news": { icon: Newspaper, category: "Intel" },
  "/trade": { icon: Zap, category: "Execution" },
};

const MAX_LENGTH = 500;

export default function TerminalInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  /* Auto-grow textarea */
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
    setShowCommands(false);
    // Reset height after clear
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (v.length > MAX_LENGTH) return;
    setValue(v);
    setShowCommands(v === "/");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* Group commands by category for the dropdown */
  const groupedCommands = AVAILABLE_COMMANDS.reduce<
    Record<string, typeof AVAILABLE_COMMANDS>
  >((acc, cmd) => {
    const cat = CMD_META[cmd.command]?.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cmd);
    return acc;
  }, {});

  const charCount = value.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.85;

  return (
    <div className="relative">
      {/* ── slash command dropdown ── */}
      {showCommands && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 glass-card p-2 max-h-72 overflow-y-auto"
          style={{
            boxShadow: "0 -8px 32px color-mix(in srgb, var(--ink) 8%, transparent)",
          }}
        >
          <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] px-2 py-1.5">
            Commands
          </div>
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category}>
              <div className="text-[9px] uppercase tracking-widest text-[var(--ink-muted)] opacity-60 px-2 pt-2 pb-1">
                {category}
              </div>
              {cmds.map((cmd) => {
                const meta = CMD_META[cmd.command];
                const Icon = meta?.icon || Slash;
                return (
                  <button
                    key={cmd.command}
                    onClick={() => {
                      setValue(cmd.command + " ");
                      setShowCommands(false);
                      textareaRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] group/cmd"
                  >
                    <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] group-hover/cmd:bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] transition-colors">
                      <Icon size={13} className="text-[var(--accent-2)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                        {cmd.command}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)] ml-2">
                        {cmd.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── input bar ── */}
      <div
        className="flex items-end gap-2 p-2 glass-card transition-all duration-200"
        style={{
          boxShadow: "0 0 0 0px transparent",
        }}
      >
        {/* Slash trigger */}
        <button
          onClick={() => setShowCommands((v) => !v)}
          className="shrink-0 p-2 mb-0.5 rounded-lg hover:bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] text-[var(--ink-muted)] hover:text-[var(--accent-2)] transition-colors"
          title="Show commands"
        >
          <Slash size={16} />
        </button>

        {/* Textarea wrapper for focus ring */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              const parent = textareaRef.current?.closest(".glass-card") as HTMLElement | null;
              if (parent) {
                parent.style.boxShadow =
                  "0 0 0 2px color-mix(in srgb, var(--accent-2) 25%, transparent)";
              }
            }}
            onBlur={() => {
              const parent = textareaRef.current?.closest(".glass-card") as HTMLElement | null;
              if (parent) {
                parent.style.boxShadow = "0 0 0 0px transparent";
              }
            }}
            placeholder="Type a message or / for commands…"
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-sm text-[var(--ink)] placeholder-[var(--ink-muted)] outline-none resize-none leading-relaxed py-1.5"
            style={{ maxHeight: 160 }}
          />
        </div>

        {/* Right side: voice + char count + send */}
        <div className="flex items-center gap-2 mb-0.5">
          <VoiceInput
            onTranscript={(text) => {
              setValue((prev) => (prev ? prev + " " + text : text));
            }}
          />
          {charCount > 0 && (
            <span
              className="text-[10px] tabular-nums transition-colors"
              style={{
                color: isNearLimit ? "var(--warning, var(--negative))" : "var(--ink-muted)",
              }}
            >
              {charCount}/{MAX_LENGTH}
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="shrink-0 p-2 rounded-xl text-white transition-all duration-200 disabled:opacity-30 disabled:scale-95"
            style={{
              background:
                value.trim() && !disabled
                  ? "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 80%, var(--positive)))"
                  : "var(--accent-2)",
              boxShadow:
                value.trim() && !disabled
                  ? "0 2px 12px color-mix(in srgb, var(--accent-2) 30%, transparent)"
                  : "none",
              transform: value.trim() && !disabled ? "scale(1)" : "scale(0.95)",
            }}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      {/* Hint text */}
      <div className="flex justify-between items-center px-2 mt-1.5">
        <span className="text-[10px] text-[var(--ink-muted)] opacity-60">
          <kbd className="px-1 py-0.5 rounded text-[9px] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">Enter</kbd> send
          <span className="mx-1.5">·</span>
          <kbd className="px-1 py-0.5 rounded text-[9px] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">Shift+Enter</kbd> new line
          <span className="mx-1.5">·</span>
          <kbd className="px-1 py-0.5 rounded text-[9px] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">/</kbd> commands
        </span>
      </div>
    </div>
  );
}
