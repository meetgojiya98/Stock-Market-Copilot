import BrandLogo from "./BrandLogo";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t soft-divider bg-[color-mix(in_srgb,var(--surface)_72%,transparent)]">
      <div className="pro-container py-5 text-xs sm:text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 muted">
        <div className="flex items-center gap-3">
          <BrandLogo withWordmark showTagline size={30} className="opacity-95" />
          <span className="hidden sm:inline h-6 w-px bg-black/10 dark:bg-white/15" />
          <span className="hidden sm:inline">High-conviction market intelligence workspace</span>
        </div>
        <span>
          {year} Stock Market Copilot · Built by Meetkumar M. Gojiya
        </span>
      </div>
    </footer>
  );
}
