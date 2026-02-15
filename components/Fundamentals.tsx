"use client";
import { useEffect, useState } from "react";

export default function Fundamentals({ symbol }: { symbol: string }) {
  const [fund, setFund] = useState<any>(null);

  useEffect(() => {
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=d0r997hr01qn4tjh94g0d0r997hr01qn4tjh94gg`)
      .then(r => r.json())
      .then(setFund);
  }, [symbol]);

  if (!fund) return <div>Loading...</div>;
  const metrics = fund.metric || {};

  return (
    <div className="bg-card dark:bg-darkcard rounded-2xl shadow-card p-4 sm:p-6 lg:p-8">
      <h2 className="text-xl font-bold text-saffron mb-4">{symbol} Fundamentals</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        <li><b>P/E:</b> {metrics.peBasicExclExtraTTM}</li>
        <li><b>Market Cap:</b> ${metrics.marketCapitalization}B</li>
        <li><b>EPS:</b> {metrics.epsTTM}</li>
        <li><b>Earnings Date:</b> {metrics.nextEarningsDate}</li>
      </ul>
    </div>
  );
}
