import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  demoAction?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  demoAction,
}: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
      {demoAction && <div className="mt-2">{demoAction}</div>}
    </div>
  );
}
