"use client";

import type { ResourceDetailPayload } from "../lib/resource-detail";
import { Modal } from "./modal";

type RecordDetailModalProps = {
  open: boolean;
  payload: ResourceDetailPayload | null;
  onClose: () => void;
};

export function RecordDetailModal({ open, payload, onClose }: RecordDetailModalProps) {
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
