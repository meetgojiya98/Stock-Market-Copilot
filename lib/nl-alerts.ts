export type ParsedCondition = {
  symbol?: string;
  metric: "price" | "change" | "volume";
  operator: "above" | "below" | "crosses";
  value: number;
};

export type NLAlert = {
  id: string;
  text: string;
  parsed: ParsedCondition;
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
};

const STORAGE_KEY = "zentrade_nl_alerts_v1";

export function parseAlertText(text: string): ParsedCondition | null {
  const normalized = text.toLowerCase().trim();

  // Extract symbol: 1-5 uppercase letters that look like a ticker
  const symbolMatch = text.match(/\b([A-Z]{1,5})\b/);
  const symbol = symbolMatch ? symbolMatch[1] : undefined;

  // Extract value: a number (possibly with decimals)
  const valueMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!valueMatch) return null;
  const value = parseFloat(valueMatch[1]);

  // Determine operator
  let operator: ParsedCondition["operator"] = "above";
  if (/(?:drops|falls|goes\s+below|dips\s+below|below|under|less\s+than|lower\s+than)/.test(normalized)) {
    operator = "below";
  } else if (/(?:rises|goes\s+above|climbs\s+above|above|over|exceeds|greater\s+than|higher\s+than|hits)/.test(normalized)) {
    operator = "above";
  } else if (/(?:crosses|reaches|touches)/.test(normalized)) {
    operator = "crosses";
  }

  // Determine metric
  let metric: ParsedCondition["metric"] = "price";
  if (/(?:volume|vol)/.test(normalized)) {
    metric = "volume";
  } else if (/(?:change|percent|%|gain|loss|move)/.test(normalized)) {
    metric = "change";
  }

  return { symbol, metric, operator, value };
}

export function getAlerts(): NLAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: NLAlert[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function saveAlert(alert: NLAlert): void {
  const alerts = getAlerts();
  const idx = alerts.findIndex((a) => a.id === alert.id);
  if (idx >= 0) {
    alerts[idx] = alert;
  } else {
    alerts.push(alert);
  }
  saveAlerts(alerts);
}

export function deleteAlert(id: string): void {
  saveAlerts(getAlerts().filter((a) => a.id !== id));
}

export function toggleAlert(id: string): void {
  const alerts = getAlerts();
  const alert = alerts.find((a) => a.id === id);
  if (alert) {
    alert.active = !alert.active;
    saveAlerts(alerts);
  }
}

export function checkAlert(alert: NLAlert, currentPrice: number): boolean {
  const { operator, value } = alert.parsed;
  switch (operator) {
    case "above":
      return currentPrice > value;
    case "below":
      return currentPrice < value;
    case "crosses":
      return Math.abs(currentPrice - value) / value < 0.005; // within 0.5%
    default:
      return false;
  }
}
