"use client";

import type { ComponentType } from "react";
import { MonitorCog, MoonStar, SunMedium } from "lucide-react";
import { useThemeMode } from "../lib/use-theme-mode";
import type { ThemeMode } from "../lib/theme-mode";

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  icon: ComponentType<{ size?: number }>;
};

const OPTIONS: ThemeOption[] = [
  { mode: "light", label: "Light", icon: SunMedium },
  { mode: "dark", label: "Dark", icon: MoonStar },
  { mode: "system", label: "System", icon: MonitorCog },
];

type ThemeModeSwitchProps = {
  className?: string;
  mode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
};

export default function ThemeModeSwitch({ className = "", mode, onModeChange }: ThemeModeSwitchProps) {
  const themeState = useThemeMode();
  const activeMode = mode ?? themeState.mode;
  const handleModeChange = onModeChange ?? themeState.setThemeMode;

  return (
    <div className={`theme-switch ${className}`} role="group" aria-label="Theme mode">
      {OPTIONS.map(({ mode: optionMode, label, icon: Icon }) => {
        const active = optionMode === activeMode;

        return (
          <button
            key={optionMode}
            type="button"
            className={`theme-switch-btn ${active ? "theme-switch-btn-active" : ""}`}
            onClick={() => handleModeChange(optionMode)}
            aria-pressed={active}
            title={`Switch theme to ${label}`}
          >
            <Icon size={14} />
            <span className="theme-switch-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
