"use client";
import { useRef } from "react";

// Define prop type for onImported callback
type PortfolioCSVManagerProps = {
  onImported: () => void;
};

export default function PortfolioCSVManager({ onImported }: PortfolioCSVManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/portfolio/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      body: formData,
    });
    onImported();
  };

  const handleExport = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/portfolio/export`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "portfolio.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  return (
    <div className="flex gap-3 items-center mb-4">
      <input
        type="file"
        accept=".csv"
        ref={fileRef}
        style={{ display: "none" }}
        onChange={handleImport}
      />
      <button onClick={() => fileRef.current?.click()} className="bg-violet-600 text-white px-3 py-1 rounded hover:bg-violet-700">Import CSV</button>
      <button onClick={handleExport} className="bg-green-500 text-white px-3 py-1 rounded">Export CSV</button>
    </div>
  );
}
