type SentimentType = "bullish" | "bearish" | "neutral";

type SentimentBadgeProps = {
  sentiment: SentimentType;
  score?: number;
  size?: "sm" | "md";
  className?: string;
};

const CONFIG: Record<SentimentType, { label: string; className: string }> = {
  bullish: { label: "Bullish", className: "sentiment-bullish" },
  bearish: { label: "Bearish", className: "sentiment-bearish" },
  neutral: { label: "Neutral", className: "sentiment-neutral" },
};

export default function SentimentBadge({
  sentiment,
  score,
  size = "sm",
  className = "",
}: SentimentBadgeProps) {
  const config = CONFIG[sentiment] || CONFIG.neutral;

  return (
    <span className={`sentiment-badge ${config.className} ${size === "md" ? "sentiment-md" : ""} ${className}`}>
      <span className="sentiment-dot" />
      {config.label}
      {typeof score === "number" && (
        <span className="sentiment-score">{Math.round(score)}%</span>
      )}
    </span>
  );
}
