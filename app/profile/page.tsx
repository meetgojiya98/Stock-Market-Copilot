"use client";
import AuthGuard from "../../components/AuthGuard";
import PageShell from "../../components/PageShell";
import ProfileCommandCenter from "../../components/ProfileCommandCenter";
import TwoFactorSetup from "../../components/TwoFactorSetup";
import ThemeCustomizer from "../../components/ThemeCustomizer";
import WebhookManager from "../../components/WebhookManager";
import { AchievementGrid, XPBar, StreakCounter } from "../../components/AchievementSystem";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <PageShell title="Profile">
        <div className="space-y-6">
          <XPBar />
          <StreakCounter />
          <ProfileCommandCenter />
          <ThemeCustomizer />
          <WebhookManager />
          <TwoFactorSetup />
          <AchievementGrid />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
