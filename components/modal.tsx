"use client";

import { useEffect, useId, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Rendered below the body; use for primary/secondary actions (e.g. Cancel + Save). */
  footer?: ReactNode;
  /** Use a denser “panel” layout (header rule, footer rule). */
  variant?: "default" | "panel";
};

export function Modal({ open, title, description, onClose, children, footer, variant = "default" }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const shellClass = variant === "panel" ? "modal modal-panel card" : "modal card";

  if (variant === "panel") {
    return (
      <div className="overlay" onClick={onClose} role="presentation">
        <div
          className={shellClass}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="modal-header">
            <h2 id={titleId}>{title}</h2>
            {description ? <p className="sub">{description}</p> : null}
          </header>
          <hr className="modal-rule" />
          <div className="modal-body">{children}</div>
          {footer ? (
            <>
              <hr className="modal-rule" />
              <footer className="modal-footer">{footer}</footer>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className={shellClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {description ? <p className="sub">{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
