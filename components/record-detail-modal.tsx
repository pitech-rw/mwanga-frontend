"use client";

import { useMemo } from "react";
import type { ResourceDetailPayload } from "../lib/resource-detail";
import { getRowActionsForRecord, type TableRowActionId } from "../lib/table-row-actions";
import { Modal } from "./modal";

type RecordDetailModalProps = {
  open: boolean;
  payload: ResourceDetailPayload | null;
  permissions: readonly string[];
  onClose: () => void;
  /** When user picks a row-level action (attach / assign). */
  onRowAction?: (actionId: TableRowActionId, row: Record<string, unknown>) => void;
};

export function RecordDetailModal({
  open,
  payload,
  permissions,
  onClose,
  onRowAction,
}: RecordDetailModalProps) {
  const actions = useMemo(() => {
    if (!payload) {
      return [];
    }
    return getRowActionsForRecord(payload.section, permissions, payload.row);
  }, [payload, permissions]);

  if (!payload) {
    return null;
  }

  return (
    <Modal
      open={open}
      variant="panel"
      title={payload.headingTitle}
      description={payload.description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="record-detail record-detail-panel">
        {payload.eyebrow ? <p className="record-detail-eyebrow">{payload.eyebrow}</p> : null}

        {payload.summary.length > 0 ? (
          <div className="record-detail-summary" role="region" aria-label="Summary">
            <p className="record-detail-summary-label">Summary</p>
            <ul className="record-detail-summary-list">
              {payload.summary.map(([label, value]) => (
                <li key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {actions.length > 0 ? (
          <div className="record-detail-actions" role="group" aria-label="Actions">
            <p className="record-detail-actions-label">Actions</p>
            <div className="record-detail-actions-row">
              {actions.map((def) => (
                <button
                  key={def.id}
                  type="button"
                  className="btn primary btn-inline"
                  onClick={() => onRowAction?.(def.id, payload.row)}
                >
                  {def.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {payload.rows.length > 0 ? (
          <>
            <p className="record-detail-fields-label">All fields</p>
            <div className="record-detail-fields">
              {payload.rows.map(([label, value]) => (
                <div key={`${label}-${value}`} className="record-detail-field-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

export type { TableRowActionId };
