"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Users, Eye, EyeOff } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CursorUser = {
  id: string;
  name: string;
  color: string;
  avatar: string;
  status: "active" | "idle" | "away";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
};

type CollaborationCursorsProps = {
  enabled?: boolean;
  className?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURSOR_USERS: Omit<CursorUser, "x" | "y" | "targetX" | "targetY">[] = [
  { id: "u1", name: "Sarah K.", color: "#3b82f6", avatar: "SK", status: "active" },
  { id: "u2", name: "James R.", color: "#f59e0b", avatar: "JR", status: "active" },
  { id: "u3", name: "Priya M.", color: "#10b981", avatar: "PM", status: "idle" },
  { id: "u4", name: "Alex T.", color: "#ef4444", avatar: "AT", status: "away" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  idle: "#f59e0b",
  away: "#94a3b8",
};

const MOVE_INTERVAL_MIN = 2000;
const MOVE_INTERVAL_MAX = 4000;
const ANIMATION_DURATION = 1200;

// ---------------------------------------------------------------------------
// Cursor SVG Arrow
// ---------------------------------------------------------------------------

function CursorArrow({ color }: { color: string }) {
  return (
    <svg
      className="collab-cursor-arrow"
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      <path
        d="M1 1L1 15.5L5.5 11.5L9.5 19L12.5 17.5L8.5 10L14 9L1 1Z"
        fill={color}
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Single animated cursor
// ---------------------------------------------------------------------------

function AnimatedCursor({ user }: { user: CursorUser }) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cursorRef.current) return;
    cursorRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    cursorRef.current.style.transform = `translate(${user.targetX}px, ${user.targetY}px)`;
  }, [user.targetX, user.targetY]);

  return (
    <div
      className="collab-cursor"
      ref={cursorRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${user.x}px, ${user.y}px)`,
        zIndex: 9990,
        pointerEvents: "none",
        willChange: "transform",
      }}
    >
      <CursorArrow color={user.color} />
      <div
        className="collab-cursor-label"
        style={{
          position: "absolute",
          top: 16,
          left: 12,
          background: user.color,
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          lineHeight: 1.5,
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {user.name}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presence bar
// ---------------------------------------------------------------------------

function PresenceBar({
  users,
  visible,
  onToggle,
}: {
  users: CursorUser[];
  visible: boolean;
  onToggle: () => void;
}) {
  const activeCount = users.filter((u) => u.status === "active").length;

  return (
    <div
      className="collab-presence"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--surface-strong)",
        border: "1px solid var(--surface-border)",
        borderRadius: 12,
        padding: "6px 12px",
        boxShadow: "var(--shadow-sm)",
        zIndex: 9991,
        fontSize: 12,
      }}
    >
      {/* User avatars */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {users.map((user, i) => (
          <div
            key={user.id}
            className="collab-avatar"
            style={{
              position: "relative",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: user.color,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              border: "2px solid var(--surface-strong)",
              marginLeft: i > 0 ? -8 : 0,
              zIndex: users.length - i,
              cursor: "default",
            }}
            title={`${user.name} (${user.status})`}
          >
            {user.avatar}
            <div
              className="collab-status-dot"
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: STATUS_COLORS[user.status] || STATUS_COLORS.away,
                border: "2px solid var(--surface-strong)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Status text */}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>
          <Users size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
          {users.length} online
        </span>
        <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>
          {activeCount} active now
        </span>
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        title={visible ? "Hide cursors" : "Show cursors"}
        style={{
          background: "none",
          border: "1px solid var(--surface-border)",
          borderRadius: 6,
          padding: "4px 6px",
          cursor: "pointer",
          color: "var(--ink-muted)",
          display: "flex",
          alignItems: "center",
          marginLeft: 4,
        }}
      >
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CollaborationCursors({
  enabled: initialEnabled = true,
  className = "",
}: CollaborationCursorsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [cursorsVisible, setCursorsVisible] = useState(true);
  const [users, setUsers] = useState<CursorUser[]>(() =>
    CURSOR_USERS.map((u) => ({
      ...u,
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 100,
      targetX: Math.random() * 600 + 100,
      targetY: Math.random() * 400 + 100,
    }))
  );

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Randomly move cursors on varying intervals
  useEffect(() => {
    if (!enabled || !cursorsVisible) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      return;
    }

    const scheduleMove = (userId: string) => {
      const delay = MOVE_INTERVAL_MIN + Math.random() * (MOVE_INTERVAL_MAX - MOVE_INTERVAL_MIN);
      const timer = setTimeout(() => {
        if (typeof window === "undefined") return;

        const maxX = window.innerWidth - 100;
        const maxY = window.innerHeight - 100;
        const newX = Math.random() * maxX + 50;
        const newY = Math.random() * maxY + 50;

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, x: u.targetX, y: u.targetY, targetX: newX, targetY: newY }
              : u
          )
        );

        // Schedule next move
        const nextTimer = scheduleMove(userId);
        timersRef.current.push(nextTimer);

        return nextTimer;
      }, delay);

      timersRef.current.push(timer);
      return timer;
    };

    // Kick off movement for each user
    CURSOR_USERS.forEach((u) => {
      scheduleMove(u.id);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [enabled, cursorsVisible]);

  // Randomly change user statuses
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setUsers((prev) =>
        prev.map((u) => {
          if (Math.random() > 0.15) return u;
          const statuses: CursorUser["status"][] = ["active", "idle", "away"];
          const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
          return { ...u, status: newStatus };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled]);

  const toggleCursors = useCallback(() => {
    setCursorsVisible((v) => !v);
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  if (!enabled) {
    return (
      <div className={className}>
        <button
          onClick={toggleEnabled}
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-strong)",
            border: "1px solid var(--surface-border)",
            borderRadius: 10,
            padding: "8px 14px",
            boxShadow: "var(--shadow-sm)",
            zIndex: 9991,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--ink-muted)",
          }}
        >
          <Users size={14} />
          Enable Collaboration
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Render cursors */}
      {cursorsVisible &&
        users
          .filter((u) => u.status !== "away")
          .map((user) => <AnimatedCursor key={user.id} user={user} />)}

      {/* Presence bar */}
      <PresenceBar users={users} visible={cursorsVisible} onToggle={toggleCursors} />
    </div>
  );
}
