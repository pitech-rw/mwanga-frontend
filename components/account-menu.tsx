"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ThemeName } from "./theme";
import {
  IconChevronDown,
  IconLogOut,
  IconMoon,
  IconSun,
  IconUsers,
} from "./icons/icon";
import { displayName, type AuthUser } from "../lib/auth";

type AccountMenuProps = {
  user: AuthUser | null;
  theme: ThemeName;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onManageUsers?: () => void;
};

function initials(user: AuthUser | null): string {
  const name = displayName(user);

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function AccountMenu({ user, theme, onToggleTheme, onSignOut, onManageUsers }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name = displayName(user);
  const role = user?.role.name ?? "member";

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-avatar" aria-hidden="true">
          {initials(user)}
        </span>
        <span className="account-trigger-copy">
          <strong>{name}</strong>
          <span>{role}</span>
        </span>
        <IconChevronDown size={16} className={`account-chevron ${open ? "open" : ""}`} />
      </button>

      {open ? (
        <div id={menuId} className="account-menu-pop card" role="menu">
          <div className="account-menu-head">
            <strong>{name}</strong>
            <span>{user?.email ?? "Signed in"}</span>
            <em>{role}</em>
          </div>
          <hr className="menu-divider" />
          {onManageUsers ? (
            <button
              type="button"
              className="account-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onManageUsers();
              }}
            >
              <IconUsers size={16} />
              User administration
            </button>
          ) : null}
          <button
            type="button"
            className="account-menu-item"
            role="menuitem"
            onClick={() => {
              onToggleTheme();
            }}
          >
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <hr className="menu-divider" />
          <button
            type="button"
            className="account-menu-item danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <IconLogOut size={16} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
