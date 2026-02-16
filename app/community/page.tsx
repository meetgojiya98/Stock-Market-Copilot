"use client";

import { useState } from "react";
import { List, MessageCircle, Trophy } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import PublicWatchlists from "../../components/PublicWatchlists";
import StockDiscussions from "../../components/StockDiscussions";
import Leaderboard from "../../components/Leaderboard";
import SharedPortfolios from "../../components/SharedPortfolios";
import CopyTradingHub from "../../components/CopyTradingHub";
import PaperTradingLeaderboard from "../../components/PaperTradingLeaderboard";
import CollaborationCursors from "../../components/CollaborationCursors";
import { AchievementGrid } from "../../components/AchievementSystem";
import QuestTracker, { TournamentBanner } from "../../components/QuestTracker";

type Tab = "watchlists" | "discussions" | "leaderboard" | "shared" | "copy" | "competition";

const TABS: { key: Tab; label: string; icon: typeof List }[] = [
  { key: "watchlists", label: "Watchlists", icon: List },
  { key: "discussions", label: "Discussions", icon: MessageCircle },
  { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  { key: "shared", label: "Shared", icon: List },
  { key: "copy", label: "Copy Trading", icon: List },
  { key: "competition", label: "Competition", icon: Trophy },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("watchlists");

  return (
    <AuthGuard>
      <PageShell title="Community">
        <div className="space-y-4">
          <TournamentBanner />
          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                  activeTab === key
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--accent)]"
                    : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25 muted"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          {activeTab === "watchlists" && <PublicWatchlists />}
          {activeTab === "discussions" && <StockDiscussions />}
          {activeTab === "leaderboard" && <Leaderboard />}
          {activeTab === "shared" && <SharedPortfolios />}
          {activeTab === "copy" && <CopyTradingHub />}
          {activeTab === "competition" && <PaperTradingLeaderboard />}
          <CollaborationCursors />
          <AchievementGrid />
          <QuestTracker />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
