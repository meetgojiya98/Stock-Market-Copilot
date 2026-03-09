// Push Notification utilities for Zentrade

export type NotificationPrefs = {
  priceAlerts: boolean;
  agentSignals: boolean;
  riskWarnings: boolean;
  newsAlerts: boolean;
};

const PREFS_KEY = "zentrade_notif_prefs_v1";

const DEFAULT_PREFS: NotificationPrefs = {
  priceAlerts: true,
  agentSignals: true,
  riskWarnings: true,
  newsAlerts: true,
};

/** Request browser notification permission. Returns the permission state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  const result = await Notification.requestPermission();
  return result;
}

/** Send a browser push notification. Falls back silently if not permitted. */
export function sendNotification(
  title: string,
  body: string,
  options?: NotificationOptions
): Notification | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;
  try {
    return new Notification(title, { body, icon: "/zentrade-logo.svg", ...options });
  } catch {
    return null;
  }
}

/** Read notification preferences from localStorage. */
export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

/** Save notification preferences to localStorage. */
export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

/** Dispatch an in-app notification toast event. */
export function dispatchToast(title: string, body: string, type: "alert" | "signal" | "risk" | "news" = "alert") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("zentrade:notify", { detail: { title, body, type } })
  );
}
