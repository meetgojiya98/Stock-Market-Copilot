import clsx from "clsx";

type BrandLogoProps = {
  className?: string;
  withWordmark?: boolean;
  showTagline?: boolean;
  size?: number;
};

export default function BrandLogo({
  className,
  withWordmark = true,
  showTagline = false,
  size = 38,
}: BrandLogoProps) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <div
        className="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/15 shadow-[0_8px_24px_rgba(8,16,32,0.2)]"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img src="/smc-logo.svg" alt="Stock Market Copilot logo" className="w-full h-full object-cover" />
      </div>

      {withWordmark && (
        <div className="leading-tight">
          <div className="font-semibold tracking-[0.015em] text-sm sm:text-base section-title">Stock Market Copilot</div>
          {showTagline && (
            <div className="text-[11px] sm:text-xs muted uppercase tracking-[0.2em]">Quantum Market OS</div>
          )}
        </div>
      )}
    </div>
  );
}
