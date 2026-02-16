"use client";

import { X, Trash2, Download, ArrowRightLeft } from "lucide-react";

type BulkActionsToolbarProps = {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onMove?: () => void;
  labels?: {
    delete?: string;
    export?: string;
    move?: string;
  };
};

export default function BulkActionsToolbar({
  count,
  onClear,
  onDelete,
  onExport,
  onMove,
  labels = {},
}: BulkActionsToolbarProps) {
  if (count === 0) return null;

  return (
    <div className="bulk-actions-toolbar">
      <div className="bulk-actions-inner">
        <span className="bulk-actions-count">
          {count} selected
        </span>

        <div className="bulk-actions-buttons">
          {onDelete && (
            <button onClick={onDelete} className="bulk-action-btn bulk-action-destructive">
              <Trash2 size={14} />
              {labels.delete || "Delete"}
            </button>
          )}
          {onExport && (
            <button onClick={onExport} className="bulk-action-btn">
              <Download size={14} />
              {labels.export || "Export"}
            </button>
          )}
          {onMove && (
            <button onClick={onMove} className="bulk-action-btn">
              <ArrowRightLeft size={14} />
              {labels.move || "Move"}
            </button>
          )}
        </div>

        <button onClick={onClear} className="bulk-action-close" aria-label="Clear selection">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
