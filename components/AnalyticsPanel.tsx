"use client";
export default function AnalyticsPanel() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
      <h3 className="font-bold text-lg mb-4">Visualization & Analytics</h3>
      <div className="text-zinc-700 dark:text-zinc-300">
        {/* Demo only */}
        <p>Your portfolio is up 6% this month.</p>
        <p>TSLA is the top mover in your portfolio.</p>
        <div className="mt-3">
          <b>Asset Allocation:</b>
          <ul className="list-disc ml-6">
            <li>Stocks: 80%</li>
            <li>Cash: 15%</li>
            <li>Bonds: 5%</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
