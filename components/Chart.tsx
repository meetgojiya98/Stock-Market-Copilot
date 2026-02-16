"use client";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { resolveChartColors, CHART_FONT, chartGridConfig } from "../lib/chart-theme";
import TimeframeSelector from "./TimeframeSelector";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

// Define props type
interface ChartProps {
  data?: any;
  loading: boolean;
  symbol?: string;
}

export default function Chart({ data: _data, loading: _loading, symbol = "AAPL" }: ChartProps) {
  const [chartData, setChartData] = useState<any>(null);
  const [range, setRange] = useState("1mo");
  const [loading, setLoading] = useState(_loading || false);
  const [error, setError] = useState("");
  const [colors, setColors] = useState(resolveChartColors());

  useEffect(() => {
    setColors(resolveChartColors());
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/chart/${symbol}?range=${range}`)
      .then(r => r.json())
      .then(response => {
        const data = response.data || [];
        if (!Array.isArray(data) || !data.length) {
          setError("No chart data available.");
          setChartData(null);
        } else {
          setChartData({
            labels: data.map((d: any) => d.date),
            datasets: [
              {
                label: `${symbol} Price`,
                data: data.map((d: any) => d.close ?? d.price),
                fill: true,
                borderColor: colors.primary,
                backgroundColor: colors.primaryFill,
                tension: 0.4,
                pointRadius: 0,
              },
            ],
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not fetch chart data.");
        setLoading(false);
      });
  }, [symbol, range]);

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl shadow p-4 sm:p-6 flex flex-col min-h-[240px] sm:h-[210px]">
      <div className="flex gap-2 mb-3 sm:mb-4 items-center flex-wrap">
        <TimeframeSelector
          value={range}
          onChange={setRange}
          timeframes={[
            { label: "1M", value: "1mo" },
            { label: "6M", value: "6mo" },
            { label: "1Y", value: "1y" },
            { label: "5Y", value: "5y" },
            { label: "Max", value: "max" },
          ]}
          enableKeyboard
        />
      </div>
      {loading ? (
        <div className="h-20 flex items-center justify-center text-gray-500 dark:text-gray-400">Loading chart...</div>
      ) : error ? (
        <div className="h-20 flex items-center justify-center text-red-500">{error}</div>
      ) : (
        chartData && (
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  mode: "index",
                  intersect: false,
                  backgroundColor: colors.background,
                  titleColor: colors.primary,
                  bodyColor: colors.text,
                  borderColor: colors.primary,
                  borderWidth: 1,
                },
              },
              scales: {
                x: {
                  ticks: {
                    color: colors.text,
                    font: CHART_FONT,
                    maxTicksLimit: 8,
                    callback: function (val: any, idx: number, values: any) {
                      if (range === "1mo" || range === "6mo") return this.getLabelForValue(val);
                      return idx % Math.ceil(values.length / 6) === 0 ? this.getLabelForValue(val) : "";
                    },
                  },
                  grid: chartGridConfig(colors),
                },
                y: {
                  ticks: {
                    color: colors.text,
                    font: CHART_FONT,
                  },
                  grid: chartGridConfig(colors),
                },
              },
              elements: {
                line: {
                  borderWidth: 2,
                },
              },
            }}
            height={110}
          />
        )
      )}
    </div>
  );
}
