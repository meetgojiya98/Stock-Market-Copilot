type SkeletonProps = {
  variant?: "text" | "circle" | "rect" | "chart";
  width?: string;
  height?: string;
  className?: string;
  count?: number;
  stagger?: boolean;
  index?: number;
};

function SkeletonUnit({
  variant = "rect",
  width,
  height,
  className,
  stagger = false,
  index = 0,
}: Omit<SkeletonProps, "count">) {
  const baseClass = `skeleton-pulse bg-[var(--surface-border)]${stagger ? " skeleton-stagger" : ""}`;

  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      width: width || "100%",
      height: height || "0.8rem",
      borderRadius: "0.375rem",
    },
    circle: {
      width: width || "2.5rem",
      height: height || width || "2.5rem",
      borderRadius: "9999px",
    },
    rect: {
      width: width || "100%",
      height: height || "2.5rem",
      borderRadius: "0.5rem",
    },
    chart: {
      width: width || "100%",
      height: height || "200px",
      borderRadius: "0.5rem",
    },
  };

  return (
    <div
      className={`${baseClass} ${className || ""}`}
      style={{
        ...variantStyles[variant || "rect"],
        ...(stagger ? { animationDelay: `${index * 80}ms` } : {}),
      }}
    />
  );
}

export default function Skeleton({
  variant = "rect",
  width,
  height,
  className,
  count = 1,
  stagger = false,
  index = 0,
}: SkeletonProps) {
  if (count <= 1) {
    return (
      <SkeletonUnit
        variant={variant}
        width={width}
        height={height}
        className={className}
        stagger={stagger}
        index={index}
      />
    );
  }

  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonUnit
          key={i}
          variant={variant}
          width={width}
          height={height}
          className={className}
          stagger={stagger}
          index={stagger ? i : 0}
        />
      ))}
    </div>
  );
}
