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
    <div className={clsx("flex items-center gap-2.5", className)}>
      <div
        className="relative rounded-[14px] overflow-hidden border border-[color-mix(in_srgb,var(--surface-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--surface-emphasis)_86%,var(--accent)_14%)] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent)_22%,transparent),color-mix(in_srgb,var(--accent-2)_18%,transparent))]" />
        <img src="/zentrade-logo.svg" alt="Zentrade logo" className="w-full h-full object-cover" />
      </div>

      {withWordmark && (
        <div className="leading-tight">
          <div className="font-semibold tracking-[0.01em] text-sm sm:text-[0.98rem] section-title">Zentrade</div>
          {showTagline && (
            <div className="text-[10px] sm:text-[11px] muted uppercase tracking-[0.16em]">Trader Studio</div>
          )}
        </div>
      )}
    </div>
  );
}
