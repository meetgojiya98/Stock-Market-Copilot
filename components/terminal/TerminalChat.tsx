"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Zap, BarChart3, Shield, Newspaper, TrendingUp, Search, Bot, Sparkles, History, Plus, Trash2, X } from "lucide-react";
import TerminalMessage, { type Message, type Source } from "./TerminalMessage";
import TerminalInput from "./TerminalInput";
import { parseSlashCommand } from "./SlashCommandParser";
import { streamAgent } from "../../lib/agents/run-agent";
import { getAgentConfig } from "../../lib/agents/configs";
import { useAgents } from "../../lib/agents/agent-store";
import { saveChatSession, loadChatSessions, deleteChatSession, generateSessionTitle, type ChatSession } from "../../lib/chat-history";

/* ── Thinking steps by agent type ── */
const THINKING_STEPS: Record<string, string[]> = {
  "market-scanner": ["Fetching price data & volume", "Analyzing technical patterns", "Identifying support/resistance levels", "Generating signals"],
  "portfolio-guardian": ["Scanning portfolio positions", "Calculating risk metrics", "Checking correlation matrix", "Generating recommendations"],
  "research-analyst": ["Gathering market data", "Analyzing fundamentals", "Reviewing recent news", "Synthesizing analysis"],
  "risk-monitor": ["Calculating volatility metrics", "Running correlation analysis", "Estimating drawdown scenarios", "Generating risk report"],
  "news-sentinel": ["Searching latest headlines", "Analyzing sentiment", "Tracking analyst coverage", "Identifying catalysts"],
  "trade-executor": ["Analyzing price action", "Calculating position sizing", "Setting risk parameters", "Building execution plan"],
};

/* ── Follow-up generators ── */
function generateFollowUps(agentId: string, symbols: string[]): string[] {
  const sym = symbols[0] || "this stock";
  const map: Record<string, string[]> = {
    "market-scanner": [
      `What's the short-term trend for ${sym}?`,
      `Show me key support and resistance for ${sym}`,
      `Compare ${sym} with its sector peers`,
    ],
    "portfolio-guardian": [
      "What positions should I rebalance?",
      "Show me my sector concentration risk",
      "What hedging strategies do you recommend?",
    ],
    "research-analyst": [
      `What are the upcoming catalysts for ${sym}?`,
      `Summarize the bull vs bear case for ${sym}`,
      `What's the fair value estimate for ${sym}?`,
    ],
    "risk-monitor": [
      "What's my max drawdown risk?",
      `How does ${sym} correlate with my other holdings?`,
      "Show me a stress test scenario",
    ],
    "news-sentinel": [
      `What's the overall sentiment for ${sym}?`,
      `Any analyst upgrades/downgrades for ${sym}?`,
      `What earnings are coming up for ${sym}?`,
    ],
    "trade-executor": [
      `What's the optimal entry point for ${sym}?`,
      `Where should I set my stop-loss for ${sym}?`,
      `What position size is appropriate for ${sym}?`,
    ],
  };
  return map[agentId] || [
    `Tell me more about ${sym}`,
    "What should I watch for this week?",
    "Any risks I should be aware of?",
  ];
}

/* ── Quick-command categories ── */
const COMMAND_GROUPS = [
  {
    label: "Analysis",
    commands: [
      { cmd: "/research NVDA", icon: Search, title: "Deep Research", desc: "Comprehensive stock analysis with sources" },
      { cmd: "/scan AAPL TSLA", icon: BarChart3, title: "Market Scan", desc: "Technical analysis & pattern detection" },
    ],
  },
  {
    label: "Risk & Portfolio",
    commands: [
      { cmd: "/risk SPY", icon: TrendingUp, title: "Risk Analysis", desc: "Volatility, correlation & drawdown" },
      { cmd: "/guard SPY QQQ", icon: Shield, title: "Portfolio Guard", desc: "Concentration & rebalancing alerts" },
    ],
  },
  {
    label: "News & Execution",
    commands: [
      { cmd: "/news MSFT", icon: Newspaper, title: "News Sentinel", desc: "Headlines, sentiment & catalysts" },
      { cmd: "/trade AAPL", icon: Zap, title: "Trade Planner", desc: "Entry, exits & position sizing" },
    ],
  },
];

export default function TerminalChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addSignals } = useAgents();

  // Load chat history
  useEffect(() => {
    setSessions(loadChatSessions());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Persist chat session when messages change
  useEffect(() => {
    if (messages.length > 0 && !isStreaming) {
      const session: ChatSession = {
        id: sessionId,
        title: generateSessionTitle(messages),
        messages,
        createdAt: messages[0]?.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveChatSession(session);
      setSessions(loadChatSessions());
    }
  }, [messages, isStreaming, sessionId]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setShowHistory(false);
  }, []);

  const loadSession = useCallback((session: ChatSession) => {
    setMessages(session.messages);
    setSessionId(session.id);
    setShowHistory(false);
  }, []);

  const deleteSession = useCallback((id: string) => {
    deleteChatSession(id);
    setSessions(loadChatSessions());
    if (id === sessionId) startNewChat();
  }, [sessionId, startNewChat]);

  const handleSubmit = useCallback(async (input: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const parsed = parseSlashCommand(input);
    const agentId = parsed.type === "agent" && parsed.agentId ? parsed.agentId : "research-analyst";
    const symbols = parsed.type === "agent" ? parsed.symbols : ["GENERAL"];
    const config = getAgentConfig(agentId);
    const steps = THINKING_STEPS[agentId] || THINKING_STEPS["research-analyst"];

    const agentMsg: Message = {
      id: crypto.randomUUID(),
      role: "agent",
      content: "",
      agentName: config?.name || "Research Analyst",
      timestamp: new Date().toISOString(),
      isStreaming: true,
      thinkingSteps: [],
    };

    setMessages((prev) => [...prev, agentMsg]);
    setIsStreaming(true);

    // Animate thinking steps before streaming
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsg.id
            ? { ...m, thinkingSteps: steps.slice(0, i + 1) }
            : m
        )
      );
    }

    // Small delay before streaming starts
    await new Promise((r) => setTimeout(r, 300));

    await streamAgent(
      agentId,
      symbols,
      parsed.query,
      (text) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === agentMsg.id ? { ...m, content: text } : m))
        );
      },
      (result) => {
        const followUps = generateFollowUps(agentId, symbols);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsg.id
              ? {
                  ...m,
                  content: result.details || result.summary,
                  isStreaming: false,
                  followUps,
                }
              : m
          )
        );
        if (result.signals.length) addSignals(result.signals);
        setIsStreaming(false);
      }
    );
  }, [addSignals]);

  return (
    <div className="flex h-full">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-64 border-r border-[var(--border)] flex flex-col bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--ink)]">Chat History</span>
            <div className="flex items-center gap-1">
              <button onClick={startNewChat} className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--accent-2)]" title="New chat">
                <Plus size={13} />
              </button>
              <button onClick={() => setShowHistory(false)} className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink)]">
                <X size={13} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] p-3">No chat history yet</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[color-mix(in_srgb,var(--accent-2)_6%,transparent)] border-b border-[var(--border)] transition-colors ${s.id === sessionId ? "bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)]" : ""}`}
                >
                  <button onClick={() => loadSession(s)} className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium text-[var(--ink)] truncate">{s.title}</p>
                    <p className="text-[10px] text-[var(--ink-muted)]">{s.messages.length} messages</p>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:!opacity-100 text-[var(--ink-muted)] hover:text-[var(--negative)]"
                    style={{ opacity: undefined }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0"; }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with history toggle */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] transition-colors"
            title="Chat history"
          >
            <History size={14} />
          </button>
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--accent-2)] hover:bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] transition-colors"
            title="New chat"
          >
            <Plus size={14} />
          </button>
          <span className="text-xs text-[var(--ink-muted)] ml-auto">
            {messages.length > 0 ? `${messages.length} messages` : "New conversation"}
          </span>
        </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            {/* Hero icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{
                background: "linear-gradient(135deg, var(--accent-2), color-mix(in srgb, var(--accent-2) 60%, var(--positive)))",
                boxShadow: "0 8px 32px color-mix(in srgb, var(--accent-2) 25%, transparent)",
              }}
            >
              <Bot size={28} className="text-white" />
            </div>

            <h3 className="text-xl font-bold text-[var(--ink)] mb-2">Agent Terminal</h3>
            <p className="text-sm text-[var(--ink-muted)] max-w-md mx-auto text-center mb-2 leading-relaxed">
              Your AI-powered trading command center. Ask anything about markets or use slash commands to invoke specialized agents.
            </p>
            <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto text-center mb-8">
              Each agent analyzes data, generates signals, and provides actionable insights.
            </p>

            {/* Grouped quick commands */}
            <div className="w-full max-w-xl space-y-5">
              {COMMAND_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--ink-muted)] mb-2.5 px-1">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.commands.map(({ cmd, icon: Icon, title, desc }) => (
                      <button
                        key={cmd}
                        onClick={() => handleSubmit(cmd)}
                        className="group/btn flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] border border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent-2)_30%,transparent)] hover:shadow-md hover:shadow-[var(--accent-2)]/5"
                      >
                        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-[color-mix(in_srgb,var(--accent-2)_8%,transparent)] group-hover/btn:bg-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] transition-colors">
                          <Icon size={16} className="text-[var(--accent-2)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[var(--ink)] mb-0.5">{title}</div>
                          <div className="text-[10px] text-[var(--ink-muted)] leading-snug">{desc}</div>
                          <div className="text-[10px] font-mono text-[var(--accent-2)] mt-1 opacity-60">{cmd}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="mt-8 flex items-center gap-2 text-[10px] text-[var(--ink-muted)]">
              <Sparkles size={10} className="text-[var(--accent-2)]" />
              <span>Or just type a question — the Research Analyst will handle it</span>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <TerminalMessage
            key={msg.id}
            message={msg}
            onFollowUp={(q) => !isStreaming && handleSubmit(q)}
          />
        ))}
      </div>
      <div className="p-4 border-t border-[var(--border)]">
        <TerminalInput onSubmit={handleSubmit} disabled={isStreaming} />
      </div>
      </div>
    </div>
  );
}
