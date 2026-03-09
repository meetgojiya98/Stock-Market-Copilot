export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export function sendBrowserNotification(
  title: string,
  body: string,
  options?: { icon?: string; tag?: string; onClick?: () => void }
) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const notif = new Notification(title, {
    body,
    icon: options?.icon || "/zentrade-logo.svg",
    tag: options?.tag,
    badge: "/zentrade-logo.svg",
  });

  if (options?.onClick) {
    notif.onclick = () => {
      window.focus();
      options.onClick?.();
      notif.close();
    };
  }

  setTimeout(() => notif.close(), 8000);
}
