export default function StockPriceCard({ symbol, price, change, loading }: {
  symbol: string; price: number | null; change: number | null; loading?: boolean;
}) {
  const color = change == null ? "text-zinc-700 dark:text-zinc-300"
    : change > 0 ? "text-green-500"
    : change < 0 ? "text-red-500"
    : "text-gray-400";

  return (
    <div className="rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 flex flex-col min-h-44 sm:h-56 justify-center bg-white/80 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 border border-zinc-100 dark:border-zinc-800 backdrop-blur">
      <span className="font-semibold text-lg sm:text-xl mb-2 text-zinc-700 dark:text-zinc-100">{symbol} Stock Price</span>
      {loading ? (
        <div className="animate-pulse mt-6 h-14 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
      ) : (
        <>
          <span className="text-3xl sm:text-4xl font-mono mb-1 text-zinc-900 dark:text-zinc-50">{price !== null ? `$${price.toFixed(2)}` : "--"}</span>
          <span className={`font-bold ${color}`}>{change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(2)}` : ""}</span>
        </>
      )}
    </div>
  );
}
