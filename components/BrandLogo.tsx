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
    <div className={clsx("flex items-center gap-2", className)}>
      <img
        src="/zentrade-logo.svg"
        alt="Zentrade"
        className="rounded-lg"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      />
      {withWordmark && (
        <div className="leading-tight">
          <div className="font-semibold tracking-[0.01em] text-sm sm:text-[0.98rem]" style={{ color: "var(--ink)" }}>Zentrade</div>
          {showTagline && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ink-muted)" }}>Trader Studio</div>
          )}
        </div>
      )}
    </div>
  );
}
