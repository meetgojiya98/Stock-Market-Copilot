"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  separator?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

interface MenuState {
  items: ContextMenuItem[];
  x: number;
  y: number;
}

interface ContextMenuApi {
  showMenu: (
    items: ContextMenuItem[],
    position: { x: number; y: number }
  ) => void;
  hideMenu: () => void;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Context
 * ──────────────────────────────────────────────────────────────────────────── */

const ContextMenuCtx = createContext<ContextMenuApi>({
  showMenu: () => {},
  hideMenu: () => {},
});

/**
 * Hook to access the context-menu API from any child component.
 *
 * ```tsx
 * const { showMenu } = useContextMenu();
 * ```
 */
export function useContextMenu(): ContextMenuApi {
  return useContext(ContextMenuCtx);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Viewport-aware positioning
 *
 * Given a requested (x, y) and the rendered menu dimensions, nudge the
 * menu so it stays fully within the viewport.
 * ──────────────────────────────────────────────────────────────────────────── */

function clampPosition(
  x: number,
  y: number,
  menuEl: HTMLElement | null
): { x: number; y: number } {
  if (!menuEl) return { x, y };

  const rect = menuEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 8; // viewport padding

  let cx = x;
  let cy = y;

  if (cx + rect.width + pad > vw) {
    cx = vw - rect.width - pad;
  }
  if (cy + rect.height + pad > vh) {
    cy = vh - rect.height - pad;
  }
  if (cx < pad) cx = pad;
  if (cy < pad) cy = pad;

  return { x: cx, y: cy };
}

/* ────────────────────────────────────────────────────────────────────────────
 * ContextMenuProvider
 *
 * Wrap your tree with this provider to enable right-click context menus
 * anywhere via the useContextMenu hook.
 *
 * Uses context-menu, context-menu-item, context-menu-separator CSS classes.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function ContextMenuProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number } | null>(null);

  /* ── API ── */
  const showMenu = useCallback(
    (items: ContextMenuItem[], position: { x: number; y: number }) => {
      setMenu({ items, x: position.x, y: position.y });
      setAdjustedPos(null); // will be computed after render
    },
    []
  );

  const hideMenu = useCallback(() => {
    setMenu(null);
    setAdjustedPos(null);
  }, []);

  /* ── Adjust position after menu renders ── */
  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const clamped = clampPosition(menu.x, menu.y, menuRef.current);
    setAdjustedPos(clamped);
  }, [menu]);

  /* ── Close on click-outside ── */
  useEffect(() => {
    if (!menu) return;

    const handler = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };

    /* Use a short delay so the current click that opened the menu doesn't
       immediately close it. */
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [menu, hideMenu]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!menu) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hideMenu();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menu, hideMenu]);

  /* ── Prevent default browser context menu when ours is open ── */
  const handleNativeContext = useCallback(
    (e: ReactMouseEvent) => {
      /* Only prevent if menu is already visible — the consumer decides
         when to call showMenu via onContextMenu on specific elements. */
      if (menu) {
        e.preventDefault();
      }
    },
    [menu]
  );

  /* ── Render position ── */
  const pos = adjustedPos ?? (menu ? { x: menu.x, y: menu.y } : null);

  return (
    <ContextMenuCtx.Provider value={{ showMenu, hideMenu }}>
      <div onContextMenu={handleNativeContext} style={{ display: "contents" }}>
        {children}
      </div>

      {menu && pos && (
        <>
          {/* Invisible overlay to capture clicks */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 199,
            }}
            onClick={hideMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              hideMenu();
            }}
            aria-hidden
          />

          {/* Menu */}
          <div
            ref={menuRef}
            className="context-menu"
            role="menu"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
            }}
          >
            {menu.items.map((item, i) => {
              /* Separator */
              if (item.separator) {
                return (
                  <div
                    key={`sep-${i}`}
                    className="context-menu-separator"
                    role="separator"
                  />
                );
              }

              return (
                <div
                  key={`${item.label}-${i}`}
                  className="context-menu-item"
                  role="menuitem"
                  aria-disabled={item.disabled || undefined}
                  style={{
                    opacity: item.disabled ? 0.4 : 1,
                    pointerEvents: item.disabled ? "none" : "auto",
                  }}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick?.();
                    hideMenu();
                  }}
                >
                  {item.icon && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        flexShrink: 0,
                        color: "var(--ink-muted)",
                      }}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.shortcut && (
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--ink-muted)",
                        marginLeft: "1rem",
                        fontFamily: "monospace",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </ContextMenuCtx.Provider>
  );
}
