"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type InlineEditableCellProps = {
  value: string | number;
  onSave: (newValue: string) => void;
  type?: "text" | "number";
  className?: string;
  displayClassName?: string;
};

export default function InlineEditableCell({
  value,
  onSave,
  type = "text",
  className = "",
  displayClassName = "",
}: InlineEditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [editing, value]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== String(value)) {
      onSave(trimmed);
    }
    setEditing(false);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(String(value));
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      cancel();
    }
  }, [commit, cancel]);

  if (editing) {
    return (
      <div className={`inline-edit-cell ${className}`}>
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="inline-edit-input"
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "any" : undefined}
        />
        <div className="inline-edit-hint">
          <kbd>Enter</kbd> save <kbd>Esc</kbd> cancel
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-edit-display ${displayClassName}`}
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}
