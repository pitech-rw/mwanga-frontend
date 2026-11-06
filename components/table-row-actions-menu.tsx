"use client";

import { useEffect, useId, useRef, useState } from "react";

export type TableRowMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

type TableRowActionsMenuProps = {
  items: TableRowMenuItem[];
};

export function TableRowActionsMenu({ items }: TableRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (items.length === 0) {
    return <span className="table-actions-placeholder">—</span>;
  }

  return (
    <div
      ref={wrapRef}
      className="table-actions-menu-wrap"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        className="table-actions-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${menuId}-menu`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="table-actions-trigger-dots" aria-hidden="true">
          <span className="table-actions-dot" />
          <span className="table-actions-dot" />
          <span className="table-actions-dot" />
        </span>
        <span className="sr-only">Open row actions</span>
      </button>
      {open ? (
        <div id={`${menuId}-menu`} role="menu" className="table-actions-dropdown">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="table-actions-dropdown-item"
              onClick={() => {
                item.onSelect();
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
