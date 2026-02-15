"use client";
import { useRef } from "react";

export default function ImportExport() {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.split("\n").map(line => line.split(","));
    const token = localStorage.getItem("access_token");
    for (const [symbol, shares] of rows.filter(r => r.length === 2)) {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/portfolio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ symbol: symbol.trim(), shares: Number(shares) })
      });
    }
    window.location.reload();
  };

  const handleExport = async () => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/portfolio`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const csv = data.map((row: { symbol: string; shares: number }) => `${row.symbol},${row.shares}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2 mb-3">
      <label className="bg-violet-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-violet-700">
        Import CSV
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />
      </label>
      <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" onClick={handleExport}>
        Export CSV
      </button>
    </div>
  );
}
