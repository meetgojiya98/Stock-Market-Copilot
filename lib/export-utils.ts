"use client";

/* ─── CSV / PDF Export Utilities ─── */

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      const str = String(val ?? "");
      // Escape commas & quotes
      return str.includes(",") || str.includes('"')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    });
    csvRows.push(values.join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * Generate a minimal valid PDF from plain text — no external library required.
 * Produces a PDF 1.4 document with a single page of wrapped text.
 */
export function exportToPDF(title: string, content: string): void {
  const lines = wrapText(content, 80);
  const titleLine = title;

  // We build raw PDF bytes manually.
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];

  const addObj = (body: string) => {
    objectCount++;
    objects.push(`${objectCount} 0 obj\n${body}\nendobj\n`);
    return objectCount;
  };

  // 1 – Catalog
  addObj("<< /Type /Catalog /Pages 2 0 R >>");

  // 2 – Pages
  addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");

  // Build stream content
  const streamLines: string[] = [];
  streamLines.push("BT");
  streamLines.push("/F1 16 Tf");
  streamLines.push("50 750 Td");
  streamLines.push(`(${pdfEscape(titleLine)}) Tj`);
  streamLines.push("0 -28 Td");
  streamLines.push("/F1 10 Tf");

  for (const line of lines) {
    streamLines.push(`(${pdfEscape(line)}) Tj`);
    streamLines.push("0 -14 Td");
  }
  streamLines.push("ET");

  const streamContent = streamLines.join("\n");

  // 4 – Stream
  const streamId = 4;
  // placeholder — we'll set 3 (Page) to reference 4
  // 3 – Page
  addObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamId} 0 R /Resources << /Font << /F1 5 0 R >> >> >>`
  );

  addObj(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);

  // 5 – Font
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  // Build final PDF
  const header = "%PDF-1.4\n";
  let body = "";
  let pos = header.length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pos);
    body += objects[i];
    pos += objects[i].length;
  }

  const xrefStart = pos;
  let xref = `xref\n0 ${objectCount + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdfString = header + body + xref + trailer;
  const blob = new Blob([pdfString], { type: "application/pdf" });
  downloadBlob(blob, `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

/* ─── Domain-specific exports ─── */

const MOCK_PRICES: Record<string, { price: number; change: number }> = {
  AAPL: { price: 189.84, change: 1.23 },
  MSFT: { price: 378.91, change: 0.87 },
  GOOGL: { price: 141.8, change: -0.45 },
  AMZN: { price: 178.25, change: 1.56 },
  TSLA: { price: 248.42, change: -2.13 },
  NVDA: { price: 495.22, change: 3.41 },
  META: { price: 390.42, change: 0.95 },
  JPM: { price: 172.13, change: 0.32 },
  V: { price: 275.48, change: 0.15 },
  JNJ: { price: 156.74, change: -0.28 },
};

function getMockPrice(symbol: string): { price: number; change: number } {
  if (MOCK_PRICES[symbol.toUpperCase()]) {
    return MOCK_PRICES[symbol.toUpperCase()];
  }
  // deterministic mock
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) & 0xffffffff;
  }
  const price = 50 + (Math.abs(hash) % 400);
  const change = ((hash % 1000) / 100).toFixed(2);
  return { price, change: parseFloat(change) };
}

export function exportPortfolioCSV(): void {
  const raw = localStorage.getItem("zentrade_portfolio_v1");
  if (!raw) {
    alert("No portfolio data found.");
    return;
  }

  const positions: { symbol: string; shares: number }[] = JSON.parse(raw);
  const data = positions.map((p) => {
    const { price, change } = getMockPrice(p.symbol);
    return {
      Symbol: p.symbol,
      Shares: p.shares,
      Price: price.toFixed(2),
      Value: (price * p.shares).toFixed(2),
      "Change%": change.toFixed(2),
    };
  });

  exportToCSV(data, "portfolio_export.csv");
}

export function exportWatchlistCSV(): void {
  const raw = localStorage.getItem("zentrade_watchlist_v1");
  if (!raw) {
    alert("No watchlist data found.");
    return;
  }

  const symbols: string[] = JSON.parse(raw);
  const data = symbols.map((symbol) => {
    const { price, change } = getMockPrice(symbol);
    return {
      Symbol: symbol,
      Price: price.toFixed(2),
      "Change%": change.toFixed(2),
    };
  });

  exportToCSV(data, "watchlist_export.csv");
}

export function exportJournalCSV(): void {
  const raw = localStorage.getItem("zentrade_trade_journal_v1");
  if (!raw) {
    alert("No trade journal data found.");
    return;
  }

  const entries: Record<string, unknown>[] = JSON.parse(raw);
  exportToCSV(entries, "trade_journal_export.csv");
}

export function exportResearchPDF(symbol: string, content: string): void {
  exportToPDF(`Research Report — ${symbol}`, content);
}

/* ─── Helpers ─── */

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function pdfEscape(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const result: string[] = [];
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      result.push(para);
    } else {
      const words = para.split(" ");
      let line = "";
      for (const word of words) {
        if (line.length + word.length + 1 > maxChars) {
          result.push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      if (line) result.push(line);
    }
  }
  return result;
}
