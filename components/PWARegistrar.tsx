"use client";

import { useEffect } from "react";

export default function PWARegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Silent fail; app still works without service worker.
      }
    };

    register();
  }, []);

  return null;
}
