"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Plus, X } from "lucide-react";

type FabAction = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

type FloatingActionButtonProps = {
  actions: FabAction[];
  className?: string;
};

export default function FloatingActionButton({ actions, className = "" }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!actions.length) return null;

  return (
    <div ref={wrapRef} className={`fab-container ${className}`}>
      {open && (
        <div className="fab-menu">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); setOpen(false); }}
              className="fab-menu-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="fab-menu-icon">{action.icon}</span>
              <span className="fab-menu-label">{action.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fab-trigger ${open ? "fab-trigger-open" : ""}`}
        aria-label={open ? "Close actions" : "Quick actions"}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  );
}
