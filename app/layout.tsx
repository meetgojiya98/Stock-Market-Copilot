import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";
import MobileDock from "../components/MobileDock";
import CommandPaletteV2 from "../components/CommandPaletteV2";
import OnboardingWizardV2 from "../components/OnboardingWizardV2";
import ConfirmDialogProvider from "../components/ConfirmDialog";
import { AgentProviderWrapper } from "./agent-provider";
import KeyboardShortcuts from "../components/KeyboardShortcuts";
import ShortcutsHelpModal from "../components/ShortcutsHelpModal";
import Onboarding from "../components/Onboarding";
import PWAInstallBanner from "../components/PWAInstallBanner";
import TickerTape from "../components/TickerTape";
import NotificationToast from "../components/NotificationToast";
import QuickActionsFAB from "../components/QuickActionsFAB";
import Script from "next/script";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Zentrade | AI Agent OS for Trading",
  description:
    "Deploy autonomous AI agents to scan markets, manage risk, research stocks, and execute trades — your intelligent trading command center.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Zentrade",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/zentrade-logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <Script
          id="theme-mode-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var MODE_KEY = "smc_theme_mode_v1";
                  var LEGACY_KEY = "theme";
                  var mode = localStorage.getItem(MODE_KEY);
                  if (mode !== "light" && mode !== "dark" && mode !== "system") {
                    var legacy = localStorage.getItem(LEGACY_KEY);
                    mode = legacy === "light" || legacy === "dark" ? legacy : "system";
                  }
                  var resolved =
                    mode === "system"
                      ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
                        ? "dark"
                        : "light"
                      : mode;
                  document.documentElement.classList.toggle("dark", resolved === "dark");
                  document.documentElement.dataset.themeMode = mode;
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased text-[var(--ink)]">
        <Providers>
          <ConfirmDialogProvider>
          <AgentProviderWrapper>
            <a href="#main-content" className="skip-link">Skip to content</a>
            <Header />
            <TickerTape />
            <main id="main-content" className="flex-1 pb-24 lg:pb-0 relative" role="main">{children}</main>
            <MobileDock />
            <Footer />
            <CommandPaletteV2 />
            <OnboardingWizardV2 />
            <KeyboardShortcuts />
            <ShortcutsHelpModal />
            <Onboarding />
            <PWAInstallBanner />
            <NotificationToast />
            <QuickActionsFAB />
          </AgentProviderWrapper>
          </ConfirmDialogProvider>
        </Providers>
      </body>
    </html>
  );
}
