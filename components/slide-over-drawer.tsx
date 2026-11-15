"use client";

import { useEffect, useId, type ReactNode } from "react";
import { IconX } from "./icons/icon";

export type SlideOverDrawerTab = {
  id: string;
  label: string;
};

type SlideOverDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: ReactNode;
  tabs?: SlideOverDrawerTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
};

export function SlideOverDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  tabs,
  activeTab,
  onTabChange,
}: SlideOverDrawerProps) {
  const titleId = useId();
  const tablistId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="drawer-overlay" role="presentation">
      <button type="button" className="drawer-overlay-dismiss" aria-label="Close panel" onClick={onClose} />
      <div
        className="drawer-panel card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div className="drawer-header-text">
            <h2 id={titleId}>{title}</h2>
            {description ? <p className="sub">{description}</p> : null}
          </div>
          <button type="button" className="btn icon-only drawer-close" aria-label="Close" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>

        {tabs && tabs.length > 0 ? (
          <div className="drawer-tabs" role="tablist" aria-label="Form sections" id={tablistId}>
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${tablistId}-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`${tablistId}-${tab.id}-panel`}
                  className={selected ? "drawer-tab drawer-tab-active" : "drawer-tab"}
                  onClick={() => onTabChange?.(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="drawer-body">{children}</div>

        {footer ? <footer className="drawer-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}