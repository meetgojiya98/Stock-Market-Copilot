/**
 * PWA utility functions for Zentrade AI Agent OS
 */

// Module-level variable to store the beforeinstallprompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

// Listen for the beforeinstallprompt event as soon as this module loads
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

/**
 * Registers the service worker if supported.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.error("[PWA] Service worker registration failed:", error);
    return null;
  }
}

/**
 * Checks if the app is running in standalone (installed PWA) mode.
 */
export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Checks if the PWA install prompt is available
 * (i.e. beforeinstallprompt has fired).
 */
export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

/**
 * Triggers the PWA install prompt.
 * Returns the user's choice or null if the prompt is unavailable.
 */
export async function promptPWAInstall(): Promise<"accepted" | "dismissed" | null> {
  if (!deferredPrompt) return null;

  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  // Clear the stored prompt — it can only be used once
  deferredPrompt = null;

  return outcome;
}

/**
 * Detects the current display mode of the app.
 */
export function getPWADisplayMode(): "browser" | "standalone" | "twa" {
  if (typeof window === "undefined") return "browser";

  if (
    document.referrer.startsWith("android-app://") ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  ) {
    return "twa";
  }

  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }

  return "browser";
}
