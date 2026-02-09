"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EquityPoint = {
  date: string;
  equity: number;
  drawdownPct: number;
};

type AdvancedEquityChartProps = {
  data: EquityPoint[];
  title?: string;
  subtitle?: string;
  className?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", { month: "short" })} ${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function AdvancedEquityChart({
  data,
  title = "Equity + Drawdown Surface",
  subtitle,
  className = "",
}: AdvancedEquityChartProps) {
  if (!data.length) {
    return (
      <div className={`card-elevated rounded-xl p-3 ${className}`}>
        <div className="text-sm font-semibold section-title">{title}</div>
        <div className="text-xs muted mt-2">No equity data available.</div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const worstDrawdown = Math.min(...data.map((item) => item.drawdownPct));

  return (
    <div className={`card-elevated rounded-xl p-3 space-y-2 ${className}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-semibold section-title">{title}</div>
          {subtitle && <div className="text-xs muted mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          <span className="rounded-full px-2 py-0.5 badge-neutral">
            Equity {formatMoney(latest.equity)}
          </span>
          <span className="rounded-full px-2 py-0.5 badge-negative">
            Max DD {worstDrawdown.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(15,141,132,0.45)" />
                <stop offset="75%" stopColor="rgba(15,141,132,0.08)" />
                <stop offset="100%" stopColor="rgba(15,141,132,0.01)" />
              </linearGradient>
              <linearGradient id="dd-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(222,58,54,0.45)" />
                <stop offset="100%" stopColor="rgba(222,58,54,0.08)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(110,122,140,0.2)" />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={30} />
            <YAxis
              yAxisId="equity"
              width={70}
              tick={{ fontSize: 11 }}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
                  value
                )
              }
            />
            <YAxis
              yAxisId="drawdown"
              orientation="right"
              domain={[-35, 0]}
              width={54}
              tick={{ fontSize: 11 }}
              tickFormatter={(value: number) => `${value.toFixed(0)}%`}
            />
            <Tooltip
              formatter={(value: number, key: string) => {
                if (key === "drawdownPct") return [`${value.toFixed(2)}%`, "Drawdown"];
                return [formatMoney(value), "Equity"];
              }}
              labelFormatter={(value: string) => new Date(value).toLocaleDateString("en-US")}
            />
            <ReferenceLine yAxisId="drawdown" y={0} stroke="rgba(120,130,150,0.45)" />
            <Area
              yAxisId="drawdown"
              type="monotone"
              dataKey="drawdownPct"
              stroke="rgba(222,58,54,0.8)"
              strokeWidth={1.4}
              fill="url(#dd-fill)"
              dot={false}
            />
            <Area
              yAxisId="equity"
              type="monotone"
              dataKey="equity"
              stroke="rgba(15,141,132,1)"
              strokeWidth={2}
              fill="url(#eq-fill)"
              dot={false}
            />
            <Line
              yAxisId="equity"
              type="monotone"
              dataKey="equity"
              stroke="var(--accent-2)"
              strokeWidth={1.3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
