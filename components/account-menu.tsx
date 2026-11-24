"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ThemeName } from "./theme";
import {
  IconChevronDown,
  IconLogOut,
  IconMoon,
  IconSun,
  IconUser,
  IconUsers,
} from "./icons/icon";
import { displayName, type AuthUser } from "../lib/auth";
import { useT } from "./locale";

type AccountMenuProps = {
  user: AuthUser | null;
  theme: ThemeName;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onOpenProfile?: () => void;
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

export function AccountMenu({ user, theme, onToggleTheme, onSignOut, onOpenProfile, onManageUsers }: AccountMenuProps) {
  const t = useT();
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
  const role = user?.role.name ?? t("account.member");
  const accountType = user?.type?.replace(/_/g, " ") ?? t("account.member");

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
          <span>{accountType}</span>
        </span>
        <IconChevronDown size={16} className={`account-chevron ${open ? "open" : ""}`} />
      </button>

      {open ? (
        <div id={menuId} className="account-menu-pop card" role="menu">
          <div className="account-menu-head">
            <strong>{name}</strong>
            <span>{user?.email ?? t("account.signedIn")}</span>
            <em>{role}</em>
          </div>
          <hr className="menu-divider" />
          {onOpenProfile ? (
            <button
              type="button"
              className="account-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenProfile();
              }}
            >
              <IconUser size={16} />
              {t("common.profile")}
            </button>
          ) : null}
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
              {t("common.userAdministration")}
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
            {theme === "dark" ? t("common.lightMode") : t("common.darkMode")}
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
            {t("common.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}