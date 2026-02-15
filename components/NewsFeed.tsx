type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
};

type NewsFeedProps = {
  news: NewsItem[];
  loading?: boolean;
};

export default function NewsFeed({ news, loading = false }: NewsFeedProps) {
  if (loading)
    return (
      <div className="rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 min-h-44 sm:h-56 flex flex-col justify-center animate-pulse bg-white/80 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 border border-zinc-100 dark:border-zinc-800 backdrop-blur">
        <div className="w-2/3 h-5 bg-zinc-200 dark:bg-zinc-700 mb-3 rounded"></div>
        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 mb-2 rounded"></div>
        <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-700 mb-2 rounded"></div>
        <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-700 mb-2 rounded"></div>
      </div>
    );
  return (
    <div className="rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 min-h-44 sm:h-56 overflow-y-auto bg-white/80 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 border border-zinc-100 dark:border-zinc-800 backdrop-blur">
      <h2 className="font-bold text-base mb-2 text-orange-600 dark:text-orange-400">Latest News</h2>
      {news && news.length ? (
        news.map((item, idx) => (
          <div key={idx} className="mb-2">
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-[var(--accent)] dark:text-[var(--accent-3)] hover:underline">
              {item.title}
            </a>
            <div className="text-xs text-gray-500 dark:text-zinc-400">
              {item.source} | {item.publishedAt && item.publishedAt.slice(0, 10)}
            </div>
          </div>
        ))
      ) : (
        <div className="text-zinc-400">No news available.</div>
      )}
    </div>
  );
}
