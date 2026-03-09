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
      <img
        src="/zentrade-logo.svg"
        alt="Zentrade"
        className="rounded-lg"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      />
      {withWordmark && (
        <div className="leading-tight">
          <div className="font-bold tracking-[-0.04em] text-sm sm:text-[0.95rem]" style={{ color: "var(--ink)" }}>Zentrade</div>
          {showTagline && (
            <div className="text-[10px] sm:text-[10.5px] uppercase tracking-[0.14em] font-medium" style={{ color: "var(--ink-muted)" }}>AI Trading Intelligence</div>
          )}
        </div>
      )}
    </div>
  );
}
