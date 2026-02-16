"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { ExternalLink, Minimize2, Radio, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PopoutMessage = {
  type: string;
  payload: unknown;
  timestamp: number;
};

type UsePopoutReturn = {
  isPopped: boolean;
  popOut: () => void;
  popIn: () => void;
  sendMessage: (type: string, payload: unknown) => void;
  lastMessage: PopoutMessage | null;
};

type PopoutPanelProps = {
  channelName: string;
  title?: string;
  children: ReactNode;
  width?: number;
  height?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Hook: usePopout
// ---------------------------------------------------------------------------

export function usePopout(channelName: string): UsePopoutReturn {
  const [isPopped, setIsPopped] = useState(false);
  const [lastMessage, setLastMessage] = useState<PopoutMessage | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const windowRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const channel = new BroadcastChannel(`smc_popout_${channelName}`);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent) => {
        const msg = event.data as PopoutMessage;
        if (msg && typeof msg.type === "string") {
          setLastMessage(msg);

          // Handle internal control messages
          if (msg.type === "__popout_closed") {
            setIsPopped(false);
            windowRef.current = null;
          } else if (msg.type === "__popout_ready") {
            setIsPopped(true);
          }
        }
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported in some environments
      return;
    }
  }, [channelName]);

  // Poll to detect if popout window was closed by the user
  useEffect(() => {
    if (!isPopped) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    checkIntervalRef.current = setInterval(() => {
      if (windowRef.current && windowRef.current.closed) {
        setIsPopped(false);
        windowRef.current = null;
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }
    }, 500);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isPopped]);

  const popOut = useCallback(() => {
    if (isPopped || typeof window === "undefined") return;

    const width = 600;
    const height = 500;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;

    try {
      const popupWindow = window.open("about:blank", `smc_popout_${channelName}`, features);

      if (!popupWindow) {
        // Popup blocked
        setLastMessage({
          type: "__popup_blocked",
          payload: { message: "Popup was blocked by the browser. Please allow popups for this site." },
          timestamp: Date.now(),
        });
        return;
      }

      windowRef.current = popupWindow;

      // Write content to popup
      const isDark = document.documentElement.classList.contains("dark");
      popupWindow.document.write(`
        <!DOCTYPE html>
        <html class="${isDark ? "dark" : ""}">
        <head>
          <title>Zentrade - ${channelName}</title>
          <style>
            :root {
              --bg-canvas: #f2f6fd;
              --bg-soft: #f8fbff;
              --ink: #0e1a2f;
              --ink-muted: #556480;
              --surface: rgba(255,255,255,0.78);
              --surface-border: rgba(17,40,84,0.14);
              --accent: #18408d;
              --positive: #2ea76d;
              --negative: #d85675;
            }
            .dark {
              --bg-canvas: #060d19;
              --bg-soft: #0b1628;
              --ink: #edf3ff;
              --ink-muted: #9babc8;
              --surface: rgba(11,25,45,0.89);
              --surface-border: rgba(156,183,227,0.23);
              --accent: #69a4ff;
              --positive: #67d996;
              --negative: #ff7e9d;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: "Manrope", "Plus Jakarta Sans", sans-serif;
              background: var(--bg-canvas);
              color: var(--ink);
              padding: 16px;
            }
            .popout-header {
              display: flex; justify-content: space-between; align-items: center;
              padding: 12px 16px; margin: -16px -16px 16px;
              border-bottom: 1px solid var(--surface-border);
              background: var(--surface);
            }
            .popout-header h2 { font-size: 15px; font-weight: 700; }
            .popout-header button {
              background: none; border: none; cursor: pointer; color: var(--ink-muted);
              font-size: 12px; display: flex; align-items: center; gap: 4px;
            }
            .popout-content { padding: 8px 0; }
            .popout-status {
              text-align: center; padding: 40px 20px;
              color: var(--ink-muted); font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="popout-header">
            <h2>${channelName}</h2>
            <button onclick="window.close()">Close Window</button>
          </div>
          <div class="popout-content">
            <div class="popout-status">
              <p style="font-size:24px;margin-bottom:8px">Connected</p>
              <p>This panel is synced with the main window via BroadcastChannel.</p>
              <p style="margin-top:12px;font-size:12px">Channel: smc_popout_${channelName}</p>
            </div>
          </div>
          <script>
            try {
              const channel = new BroadcastChannel('smc_popout_${channelName}');
              channel.postMessage({ type: '__popout_ready', payload: null, timestamp: Date.now() });

              channel.onmessage = function(e) {
                const content = document.querySelector('.popout-content');
                if (e.data && e.data.type === '__content_update' && content) {
                  content.innerHTML = '<div style="padding:8px">' + (e.data.payload || '') + '</div>';
                }
              };

              window.addEventListener('beforeunload', function() {
                channel.postMessage({ type: '__popout_closed', payload: null, timestamp: Date.now() });
                channel.close();
              });
            } catch(err) {
              console.warn('BroadcastChannel not available:', err);
            }
          </script>
        </body>
        </html>
      `);
      popupWindow.document.close();

      setIsPopped(true);
    } catch {
      setLastMessage({
        type: "__popup_error",
        payload: { message: "Failed to open popup window." },
        timestamp: Date.now(),
      });
    }
  }, [isPopped, channelName]);

  const popIn = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.close();
    }
    windowRef.current = null;
    setIsPopped(false);
  }, []);

  const sendMessage = useCallback((type: string, payload: unknown) => {
    if (!channelRef.current) return;
    const msg: PopoutMessage = { type, payload, timestamp: Date.now() };
    channelRef.current.postMessage(msg);
  }, []);

  return useMemo(
    () => ({ isPopped, popOut, popIn, sendMessage, lastMessage }),
    [isPopped, popOut, popIn, sendMessage, lastMessage]
  );
}

// ---------------------------------------------------------------------------
// PopoutPanel component
// ---------------------------------------------------------------------------

export default function PopoutPanel({
  channelName,
  title,
  children,
  className = "",
}: PopoutPanelProps) {
  const { isPopped, popOut, popIn, lastMessage } = usePopout(channelName);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Handle popup blocked message
  useEffect(() => {
    if (lastMessage?.type === "__popup_blocked") {
      setPopupBlocked(true);
      const timer = setTimeout(() => setPopupBlocked(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* Popout controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {title && (
          <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
            {title}
          </span>
        )}
        {isPopped ? (
          <>
            {/* Popped-out badge */}
            <span
              className="popout-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 12,
                background: "var(--accent)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                animation: "pulse 2s infinite",
              }}
            >
              <Radio size={11} />
              Popped Out
            </span>
            <button
              className="popout-btn"
              onClick={popIn}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                border: "1px solid var(--surface-border)",
                borderRadius: 6,
                background: "var(--bg-soft)",
                color: "var(--ink)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Minimize2 size={13} />
              Pop In
            </button>
          </>
        ) : (
          <button
            className="popout-btn"
            onClick={popOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              border: "1px solid var(--surface-border)",
              borderRadius: 6,
              background: "var(--bg-soft)",
              color: "var(--ink)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <ExternalLink size={13} />
            Pop Out
          </button>
        )}
      </div>

      {/* Popup blocked warning */}
      {popupBlocked && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--negative)",
            color: "#fff",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          <AlertCircle size={14} />
          Popup was blocked. Please allow popups for this site and try again.
        </div>
      )}

      {/* Content area */}
      {isPopped ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            border: "2px dashed var(--surface-border)",
            borderRadius: 10,
            color: "var(--ink-muted)",
            fontSize: 13,
          }}
        >
          <ExternalLink size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Content is in a separate window</div>
          <div style={{ fontSize: 12 }}>Click &quot;Pop In&quot; to return it here</div>
        </div>
      ) : (
        <div>{children}</div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
