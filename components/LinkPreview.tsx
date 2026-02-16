"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";

type LinkPreviewProps = {
  href: string;
  children: ReactNode;
  title?: string;
  description?: string;
  favicon?: string;
  className?: string;
};

export default function LinkPreview({
  href,
  children,
  title,
  description,
  favicon,
  className = "",
}: LinkPreviewProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 400);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const domain = (() => {
    try { return new URL(href).hostname.replace("www.", ""); } catch { return ""; }
  })();

  return (
    <span
      className={`link-preview-trigger ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (title || description) && (
        <div className="link-preview-card">
          <div className="link-preview-header">
            {favicon && <img src={favicon} alt="" className="link-preview-favicon" width={16} height={16} />}
            <span className="link-preview-domain">{domain}</span>
            <ExternalLink size={10} className="muted" />
          </div>
          {title && <div className="link-preview-title">{title}</div>}
          {description && <div className="link-preview-desc">{description}</div>}
        </div>
      )}
    </span>
  );
}
