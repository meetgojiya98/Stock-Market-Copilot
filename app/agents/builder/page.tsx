"use client";

import AuthGuard from "../../../components/AuthGuard";
import PageShell from "../../../components/PageShell";
import { useState } from "react";
import { Save, Bot, Palette, Wrench, MessageSquare, ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";

type CustomAgentConfig = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  tools: { id: string; name: string; endpoint: string; description: string }[];
  defaultInterval: number;
  isCustom: true;
};

const STORAGE_KEY = "zentrade_custom_agents_v1";
const AVAILABLE_TOOLS = [
  { id: "price", name: "Live Price", endpoint: "/api/stocks/price", description: "Fetch current price and change" },
  { id: "chart", name: "Price History", endpoint: "/api/stocks/chart", description: "Fetch OHLC chart data" },
  { id: "news", name: "News Feed", endpoint: "/api/stocks/news", description: "Recent news articles" },
];

const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e", "#64748b"];

export default function AgentBuilderPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [selectedTools, setSelectedTools] = useState<string[]>(["price", "chart"]);
  const [systemPrompt, setSystemPrompt] = useState(`You are a custom trading analysis agent. Analyze the given symbols and provide insights.

Return your analysis as JSON:
{
  "summary": "one-line overview",
  "signals": [
    { "type": "bullish|bearish|neutral|alert", "symbol": "TICKER", "message": "insight", "confidence": 0-100 }
  ],
  "details": "full markdown analysis"
}`);
  const [saved, setSaved] = useState(false);

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const agent: CustomAgentConfig = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "Custom analysis agent",
      icon: "Bot",
      color,
      systemPrompt,
      tools: AVAILABLE_TOOLS.filter((t) => selectedTools.includes(t.id)),
      defaultInterval: 0,
      isCustom: true,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      existing.unshift(agent);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {}

    setSaved(true);
    setTimeout(() => router.push("/agents"), 1500);
  };

  return (
    <AuthGuard>
      <PageShell title="Agent Builder" subtitle="Create a custom AI agent with your own system prompt">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Back */}
          <button
            onClick={() => router.push("/agents")}
            className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--accent-2)] transition-colors"
          >
            <ArrowLeft size={12} />
            Back to Agents
          </button>

          {/* Name + Description */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bot size={14} className="text-[var(--accent-2)]" />
              <span className="text-xs font-bold text-[var(--ink)]">Identity</span>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1 block">Agent Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Momentum Hunter"
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-[var(--ink)] border border-[var(--border)] outline-none focus:border-[var(--accent-2)]"
                maxLength={40}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-1 block">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent do?"
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-[var(--ink)] border border-[var(--border)] outline-none focus:border-[var(--accent-2)]"
                maxLength={100}
              />
            </div>
          </div>

          {/* Color */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-[var(--accent-2)]" />
              <span className="text-xs font-bold text-[var(--ink)]">Color</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-xl border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: color === c ? "white" : "transparent",
                    boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
                  }}
                >
                  {color === c && <Check size={14} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={14} className="text-[var(--accent-2)]" />
              <span className="text-xs font-bold text-[var(--ink)]">Tools</span>
            </div>
            <div className="space-y-2">
              {AVAILABLE_TOOLS.map((tool) => {
                const selected = selectedTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border transition-all"
                    style={{
                      borderColor: selected ? color : "var(--border)",
                      background: selected ? `color-mix(in srgb, ${color} 8%, transparent)` : "transparent",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
                      style={{
                        borderColor: selected ? color : "var(--ink-muted)",
                        background: selected ? color : "transparent",
                      }}
                    >
                      {selected && <Check size={10} className="text-white" />}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[var(--ink)]">{tool.name}</span>
                      <p className="text-[10px] text-[var(--ink-muted)]">{tool.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Prompt */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-[var(--accent-2)]" />
              <span className="text-xs font-bold text-[var(--ink)]">System Prompt</span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-transparent text-[var(--ink)] border border-[var(--border)] outline-none focus:border-[var(--accent-2)] resize-y leading-relaxed"
              placeholder="Enter the system prompt that defines your agent's behavior..."
            />
            <p className="text-[10px] text-[var(--ink-muted)] mt-1.5">
              The system prompt defines your agent's personality and output format. Always include JSON output format for signals parsing.
            </p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!name.trim() || saved}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: saved ? "var(--positive)" : color }}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? "Saved! Redirecting..." : "Save Agent"}
          </button>
        </div>
      </PageShell>
    </AuthGuard>
  );
}
