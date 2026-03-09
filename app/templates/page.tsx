"use client";

import { useState, useEffect, useMemo } from "react";
import { Store, Search, Star, Download, Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import PageShell from "@/components/PageShell";
import {
  getBuiltInTemplates,
  loadCustomTemplates,
  installTemplate,
  type AgentTemplate,
} from "@/lib/agent-templates";
import { getCustomAgents } from "@/lib/agents/custom-agents";
import Link from "next/link";

type Category = "all" | "trading" | "research" | "risk" | "news" | "custom";

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  trading: "Trading",
  research: "Research",
  risk: "Risk",
  news: "News",
  custom: "Custom",
};

const CATEGORY_COLORS: Record<string, string> = {
  trading: "var(--accent-2)",
  research: "var(--accent-3)",
  risk: "var(--negative)",
  news: "var(--warning)",
  custom: "#6366f1",
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < full ? "fill-yellow-400 text-yellow-400" : hasHalf && i === full ? "fill-yellow-400/50 text-yellow-400" : "text-[var(--ink-muted)]/30"}
        />
      ))}
      <span className="ml-1 text-xs" style={{ color: "var(--ink-muted)" }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function TemplateCard({
  template,
  isInstalled,
  onInstall,
}: {
  template: AgentTemplate;
  isInstalled: boolean;
  onInstall: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-bold text-sm truncate" style={{ color: "var(--ink)" }}>
              {template.name}
            </h3>
            <span
              className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                color: CATEGORY_COLORS[template.category] || "var(--ink-muted)",
                backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[template.category] || "var(--ink-muted)"} 12%, transparent)`,
              }}
            >
              {template.category}
            </span>
          </div>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--ink-muted)" }}>
            {template.description}
          </p>
        </div>
        {isInstalled && (
          <span className="shrink-0 p-1 rounded-full bg-emerald-500/15">
            <Check size={14} className="text-emerald-500" />
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--ink-muted)" }}>
        <span>by {template.author}</span>
        <div className="flex items-center gap-3">
          <StarRating rating={template.rating} />
          <span className="inline-flex items-center gap-1">
            <Download size={11} />
            {template.downloads.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          onClick={onInstall}
          disabled={isInstalled}
          className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={
            isInstalled
              ? { color: "var(--ink-muted)", backgroundColor: "color-mix(in srgb, var(--ink-muted) 10%, transparent)" }
              : { color: "var(--accent-2)", backgroundColor: "color-mix(in srgb, var(--accent-2) 12%, transparent)" }
          }
        >
          {isInstalled ? "Installed" : "Install"}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{ color: "var(--ink-muted)", backgroundColor: "color-mix(in srgb, var(--ink-muted) 8%, transparent)" }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div
          className="mt-1 p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap"
          style={{
            color: "var(--ink-muted)",
            backgroundColor: "color-mix(in srgb, var(--ink) 4%, transparent)",
            borderLeft: "2px solid var(--accent-2)",
          }}
        >
          <span className="block text-[0.65rem] uppercase tracking-wider font-semibold mb-1.5" style={{ color: "var(--ink)" }}>
            System Prompt
          </span>
          {template.systemPrompt}
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [customTemplates, setCustomTemplates] = useState<AgentTemplate[]>([]);

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
    // Check which templates are installed by matching names against custom agents
    const customAgents = getCustomAgents();
    const names = new Set(customAgents.map((a) => a.name));
    const installed = new Set<string>();
    for (const t of [...getBuiltInTemplates(), ...loadCustomTemplates()]) {
      if (names.has(t.name)) installed.add(t.id);
    }
    setInstalledIds(installed);
  }, []);

  const allTemplates = useMemo(() => {
    return [...getBuiltInTemplates(), ...customTemplates];
  }, [customTemplates]);

  const filtered = useMemo(() => {
    let list = allTemplates;
    if (activeCategory !== "all") {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allTemplates, activeCategory, search]);

  function handleInstall(template: AgentTemplate) {
    installTemplate(template);
    setInstalledIds((prev) => new Set([...prev, template.id]));
  }

  return (
    <AuthGuard>
      <PageShell
        title="Agent Templates"
        actions={
          <Link
            href="/agents/builder"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ color: "var(--accent-2)", backgroundColor: "color-mix(in srgb, var(--accent-2) 12%, transparent)" }}
          >
            <ExternalLink size={13} />
            Create Template
          </Link>
        }
      >
        {/* Search bar */}
        <div className="mb-5">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--ink) 5%, transparent)" }}
          >
            <Search size={15} style={{ color: "var(--ink-muted)" }} />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--ink)" }}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors"
              style={
                activeCategory === cat
                  ? { color: "#fff", backgroundColor: "var(--accent-2)" }
                  : { color: "var(--ink-muted)", backgroundColor: "color-mix(in srgb, var(--ink-muted) 8%, transparent)" }
              }
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Template grid */}
        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              No templates found matching your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isInstalled={installedIds.has(template.id)}
                onInstall={() => handleInstall(template)}
              />
            ))}
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
