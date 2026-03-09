"use client";

import { useCallback, useEffect, useState } from "react";
import PageShell from "../../components/PageShell";
import {
  Palette,
  Bell,
  Database,
  Check,
  RotateCcw,
  Download,
  Trash2,
  Volume2,
  Mail,
  BellRing,
  HardDrive,
} from "lucide-react";
import {
  type ThemeConfig,
  PRESET_ACCENT_COLORS,
  getThemeConfig,
  saveThemeConfig,
  applyTheme,
  getDefaultConfig,
} from "../../lib/theme-customizer";

type ToggleOption<T extends string> = { label: string; value: T };

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--surface-border)" }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor:
              value === opt.value ? "var(--accent-2)" : "var(--surface)",
            color: value === opt.value ? "#fff" : "var(--ink-muted)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{
        backgroundColor: checked ? "var(--accent-2)" : "var(--surface-border)",
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ThemeConfig>(getDefaultConfig);
  const [notifications, setNotifications] = useState({
    push: true,
    sound: true,
    emailDigest: false,
  });
  const [storageUsage, setStorageUsage] = useState("Calculating...");
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    const saved = getThemeConfig();
    setConfig(saved);
    applyTheme(saved);
    calculateStorage();
  }, []);

  const calculateStorage = () => {
    if (typeof window === "undefined") return;
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          total += (localStorage.getItem(key) || "").length * 2;
        }
      }
      const kb = (total / 1024).toFixed(1);
      const mb = (total / (1024 * 1024)).toFixed(2);
      setStorageUsage(
        total > 1024 * 1024 ? `${mb} MB` : `${kb} KB`
      );
    } catch {
      setStorageUsage("Unknown");
    }
  };

  const updateConfig = useCallback(
    (partial: Partial<ThemeConfig>) => {
      const next = { ...config, ...partial };
      setConfig(next);
      saveThemeConfig(next);
      applyTheme(next);
    },
    [config]
  );

  const resetToDefaults = () => {
    const defaults = getDefaultConfig();
    setConfig(defaults);
    saveThemeConfig(defaults);
    applyTheme(defaults);
  };

  const exportData = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("zentrade")) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zentrade-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("zentrade")) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    setShowConfirmClear(false);
    resetToDefaults();
    calculateStorage();
  };

  return (
    <PageShell
      title="Settings"
      subtitle="Customize your Zentrade experience"
      actions={
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{
            color: "var(--ink-muted)",
            border: "1px solid var(--surface-border)",
          }}
        >
          <RotateCcw size={14} />
          Reset to Defaults
        </button>
      }
    >
      <div className="space-y-6">
        {/* Theme Section */}
        <div className="glass-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Palette size={18} style={{ color: "var(--accent-2)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Theme
            </h2>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--ink-muted)" }}
            >
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateConfig({ accentColor: color })}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    boxShadow:
                      config.accentColor === color
                        ? `0 0 0 2px var(--surface), 0 0 0 4px ${color}`
                        : "none",
                  }}
                >
                  {config.accentColor === color && (
                    <Check size={14} className="text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Scale */}
          <div className="space-y-2">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--ink-muted)" }}
            >
              Font Scale
            </label>
            <ToggleGroup
              options={[
                { label: "Compact", value: "compact" as const },
                { label: "Default", value: "default" as const },
                { label: "Large", value: "large" as const },
              ]}
              value={config.fontScale}
              onChange={(v) => updateConfig({ fontScale: v })}
            />
          </div>

          {/* Density */}
          <div className="space-y-2">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--ink-muted)" }}
            >
              Density
            </label>
            <ToggleGroup
              options={[
                { label: "Compact", value: "compact" as const },
                { label: "Comfortable", value: "comfortable" as const },
                { label: "Spacious", value: "spacious" as const },
              ]}
              value={config.density}
              onChange={(v) => updateConfig({ density: v })}
            />
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--ink-muted)" }}
            >
              Border Radius
            </label>
            <ToggleGroup
              options={[
                { label: "None", value: "none" as const },
                { label: "Small", value: "small" as const },
                { label: "Medium", value: "medium" as const },
                { label: "Large", value: "large" as const },
              ]}
              value={config.borderRadius}
              onChange={(v) => updateConfig({ borderRadius: v })}
            />
          </div>
        </div>

        {/* Notifications Section */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={18} style={{ color: "var(--accent-2)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Notifications
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing size={14} style={{ color: "var(--ink-muted)" }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  Push Notifications
                </span>
              </div>
              <ToggleSwitch
                checked={notifications.push}
                onChange={(v) =>
                  setNotifications((p) => ({ ...p, push: v }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={14} style={{ color: "var(--ink-muted)" }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  Sound
                </span>
              </div>
              <ToggleSwitch
                checked={notifications.sound}
                onChange={(v) =>
                  setNotifications((p) => ({ ...p, sound: v }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={14} style={{ color: "var(--ink-muted)" }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  Email Digest
                </span>
              </div>
              <ToggleSwitch
                checked={notifications.emailDigest}
                onChange={(v) =>
                  setNotifications((p) => ({ ...p, emailDigest: v }))
                }
              />
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database size={18} style={{ color: "var(--accent-2)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Data
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <HardDrive size={14} style={{ color: "var(--ink-muted)" }} />
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Storage used:{" "}
              <span style={{ color: "var(--ink)" }} className="font-medium">
                {storageUsage}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: "var(--surface-2)",
                color: "var(--ink)",
                border: "1px solid var(--surface-border)",
              }}
            >
              <Download size={14} />
              Export All Data
            </button>

            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  color: "var(--negative)",
                  border: "1px solid var(--negative)",
                }}
              >
                <Trash2 size={14} />
                Clear All Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={{ color: "var(--warning)" }}
                >
                  Are you sure?
                </span>
                <button
                  onClick={clearAllData}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ backgroundColor: "var(--negative)" }}
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    color: "var(--ink-muted)",
                    border: "1px solid var(--surface-border)",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
