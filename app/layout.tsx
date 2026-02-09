import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";
import MobileDock from "../components/MobileDock";
import Script from "next/script";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Stock Market Copilot | AI Investment Command Center",
  description:
    "Advanced AI-powered stock analytics workspace with portfolio intelligence, watchlists, alerts, and research copiloting.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Stock Market Copilot",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/smc-logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f6df2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="sw-hard-reset"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var FLAG_KEY = "smc_sw_hard_reset_v1";
                  if (sessionStorage.getItem(FLAG_KEY) === "done") return;
                  if (!("serviceWorker" in navigator)) {
                    sessionStorage.setItem(FLAG_KEY, "done");
                    return;
                  }
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
          <Header />
          <main className="flex-1 pb-24 md:pb-8 relative">{children}</main>
          <MobileDock />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
