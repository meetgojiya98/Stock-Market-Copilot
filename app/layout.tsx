import "./globals.css";
import { Providers } from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";
import MobileDock from "../components/MobileDock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Market Copilot | AI Investment Command Center",
  description:
    "Advanced AI-powered stock analytics workspace with portfolio intelligence, watchlists, alerts, and research copiloting.",
  icons: {
    icon: "/smc-logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
