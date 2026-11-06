"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TableRowMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

type TableRowActionsMenuProps = {
  items: TableRowMenuItem[];
};

const DROPDOWN_MIN_WIDTH = 180;

export function TableRowActionsMenu({ items }: TableRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const updateDropdownPosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - DROPDOWN_MIN_WIDTH),
      window.innerWidth - DROPDOWN_MIN_WIDTH - 8,
    );
    setDropdownPos({ top: rect.bottom + 6, left });
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest("[data-table-row-actions-popover]")) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownPos(null);
      return;
    }

    updateDropdownPosition();

    const wrap = buttonRef.current?.closest(".table-wrap");

    const onScrollOrResize = () => {
      updateDropdownPosition();
    };

    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    wrap?.addEventListener("scroll", onScrollOrResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && buttonRef.current) {
      ro = new ResizeObserver(onScrollOrResize);
      ro.observe(buttonRef.current);
    }

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      wrap?.removeEventListener("scroll", onScrollOrResize);
      ro?.disconnect();
    };
  }, [open, updateDropdownPosition]);

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
      {open && dropdownPos != null && typeof document !== "undefined"
        ? createPortal(
            <div
              id={`${menuId}-menu`}
              role="menu"
              data-table-row-actions-popover=""
              className="table-actions-dropdown table-actions-dropdown-portal"
              style={{ top: dropdownPos.top, left: dropdownPos.left, minWidth: DROPDOWN_MIN_WIDTH }}
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
