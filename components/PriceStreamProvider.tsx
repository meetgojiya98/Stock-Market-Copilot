"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getPriceStream, type ConnectionStatus, type PriceUpdate } from "../lib/price-stream";

type PriceStreamContextValue = {
  subscribe: (symbol: string) => () => void;
  prices: Record<string, PriceUpdate>;
  connectionStatus: ConnectionStatus;
};

const PriceStreamContext = createContext<PriceStreamContextValue>({
  subscribe: () => () => {},
  prices: {},
  connectionStatus: "disconnected",
});

export function usePriceStream() {
  return useContext(PriceStreamContext);
}

export function ConnectionStatusBadge() {
  const { connectionStatus } = usePriceStream();

  const label =
    connectionStatus === "connected"
      ? "Live"
      : connectionStatus === "connecting"
      ? "Connecting"
      : connectionStatus === "error"
      ? "Error"
      : "Offline";

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] muted">
      <span className={`connection-dot ${connectionStatus}`} />
      {label}
    </span>
  );
}

export default function PriceStreamProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const streamRef = useRef(getPriceStream());

  useEffect(() => {
    const stream = streamRef.current;

    const priceCleanup = stream.onPrice((update) => {
      setPrices((prev) => ({ ...prev, [update.symbol]: update }));
    });

    const statusCleanup = stream.onStatus((status) => {
      setConnectionStatus(status);
    });

    return () => {
      priceCleanup();
      statusCleanup();
    };
  }, []);

  const subscribe = useCallback((symbol: string) => {
    return streamRef.current.subscribe(symbol);
  }, []);

  return (
    <PriceStreamContext.Provider value={{ subscribe, prices, connectionStatus }}>
      {children}
    </PriceStreamContext.Provider>
  );
}
