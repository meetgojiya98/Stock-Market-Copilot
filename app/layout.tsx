import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";
import MobileDock from "../components/MobileDock";
import CommandPaletteV2 from "../components/CommandPaletteV2";
import OnboardingWizardV2 from "../components/OnboardingWizardV2";
import KeyboardShortcutsProvider from "../components/KeyboardShortcutsProvider";
import PriceStreamProvider from "../components/PriceStreamProvider";
import ToastProvider from "../components/ToastProvider";
import ConfirmDialogProvider from "../components/ConfirmDialog";
import ContextualTips from "../components/ContextualTips";
import StatusBar from "../components/StatusBar";
import { StockDetailProvider } from "../components/StockDetailSlideOver";
import VimNavigation from "../components/VimNavigation";
import MobileGestureNav from "../components/MobileGestureNav";
import ContextMenuProvider from "../components/ContextMenuProvider";
import ShortcutOverlay from "../components/ShortcutOverlay";
import QuickTradeModal from "../components/QuickTradeModal";
import SmartSearch from "../components/SmartSearch";
import { AudioCueManager } from "../components/AudioFeedback";
import Script from "next/script";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Zentrade | Your Trading Toolkit",
  description:
    "Track your portfolio, research stocks with AI, practice trades, and stay on top of the market — all in one app.",
  manifest: "/manifest.webmanifest",
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
  themeColor: "#18408d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
                } catch (error) {
                  // Best effort only.
                }
              })();
            `,
          }}
        />
        <Script
          id="sw-hard-reset"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var FLAG_KEY = "smc_sw_hard_reset_v1";
                  if (sessionStorage.getItem(FLAG_KEY) !== "done") {
                    if (!("serviceWorker" in navigator)) {
                      sessionStorage.setItem(FLAG_KEY, "done");
                    } else {
                      navigator.serviceWorker.getRegistrations().then(function (registrations) {
                        if (!registrations || registrations.length === 0) {
                          sessionStorage.setItem(FLAG_KEY, "done");
                          return;
                        }
                        Promise.all(
                          registrations.map(function (registration) {
                            return registration.unregister();
                          })
                        )
                          .then(function () {
                            if (!("caches" in window)) return;
                            return caches.keys().then(function (keys) {
                              return Promise.all(
                                keys.map(function (key) {
                                  return caches.delete(key);
                                })
                              );
                            });
                          })
                          .finally(function () {
                            sessionStorage.setItem(FLAG_KEY, "done");
                            var url = new URL(window.location.href);
                            if (url.searchParams.get("sw-reset") !== "1") {
                              url.searchParams.set("sw-reset", "1");
                              window.location.replace(url.toString());
                            }
                          });
                      });
                    }
                  }
                } catch (error) {
                  // Best effort only.
                }

                try {
                  var CHUNK_FLAG_KEY = "smc_chunk_reload_v2";
                  var isChunkFailure = function (text) {
                    var value = String(text || "");
                    return (
                      value.indexOf("ChunkLoadError") !== -1 ||
                      value.indexOf("Loading chunk") !== -1 ||
                      value.indexOf("/_next/static/chunks/") !== -1
                    );
                  };
                  var recoverChunk = function () {
                    if (sessionStorage.getItem(CHUNK_FLAG_KEY) === "done") return;
                    sessionStorage.setItem(CHUNK_FLAG_KEY, "done");

                    Promise.resolve()
                      .then(function () {
                        if (!("caches" in window)) return;
                        return caches.keys().then(function (keys) {
                          return Promise.all(
                            keys.map(function (key) {
                              return caches.delete(key);
                            })
                          );
                        });
                      })
                      .finally(function () {
                        var url = new URL(window.location.href);
                        url.searchParams.set("chunk-reload", "1");
                        window.location.replace(url.toString());
                      });
                  };

                  window.addEventListener(
                    "error",
                    function (event) {
                      var message = event && event.message ? event.message : "";
                      var filename = event && event.filename ? event.filename : "";
                      if (isChunkFailure(message) || isChunkFailure(filename)) {
                        recoverChunk();
                      }
                    },
                    true
                  );

                  window.addEventListener("unhandledrejection", function (event) {
                    var reason = event ? event.reason : "";
                    var message =
                      typeof reason === "string"
                        ? reason
                        : reason && reason.message
                        ? reason.message
                        : String(reason || "");
                    if (isChunkFailure(message)) {
                      recoverChunk();
                    }
                  });
                } catch (error) {
                  // Best effort only.
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased text-[var(--ink)]">
        <Providers>
          <ToastProvider>
          <ConfirmDialogProvider>
          <PriceStreamProvider>
            <KeyboardShortcutsProvider>
            <StockDetailProvider>
            <ContextMenuProvider>
            <AudioCueManager>
            <VimNavigation>
              <a href="#main-content" className="skip-link">Skip to content</a>
              <StatusBar />
              <Header />
              <main id="main-content" className="flex-1 pb-24 lg:pb-0 relative" role="main">{children}</main>
              <MobileDock />
              <MobileGestureNav />
              <Footer />
              <CommandPaletteV2 />
              <OnboardingWizardV2 />
              <ContextualTips />
              <ShortcutOverlay />
              <QuickTradeModal />
              <SmartSearch />
            </VimNavigation>
            </AudioCueManager>
            </ContextMenuProvider>
            </StockDetailProvider>
            </KeyboardShortcutsProvider>
          </PriceStreamProvider>
          </ConfirmDialogProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
