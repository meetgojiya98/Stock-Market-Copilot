"use client";

import { useEffect } from "react";

export default function PWARegistrar() {
  useEffect(() => {
    const CHUNK_FIX_FLAG = "smc_chunk_fix_attempted_v1";

    const clearAndReload = async () => {
      if (sessionStorage.getItem(CHUNK_FIX_FLAG) === "1") return;
      sessionStorage.setItem(CHUNK_FIX_FLAG, "1");

      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      } catch {
        // best effort
      }

      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // best effort
      }

      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const message = String(event?.message || "");
      if (message.includes("ChunkLoadError") || message.includes("Loading chunk")) {
        clearAndReload();
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : String(event.reason?.message || event.reason || "");
      if (reason.includes("ChunkLoadError") || reason.includes("Loading chunk")) {
        clearAndReload();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
      };
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        registration.update().catch(() => undefined);
      } catch {
        // Silent fail; app still works without service worker.
      }
    };

    register();

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
