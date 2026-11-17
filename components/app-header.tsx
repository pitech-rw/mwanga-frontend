"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { LocaleSwitch } from "./locale-switch";
import { IconBell, IconMenu } from "./icons/icon";
import type { ThemeName } from "./theme";
import type { AuthUser } from "../lib/auth";

export type AppHeaderCrumb = {
  href?: string;
  label: string;
};

type AppHeaderProps = {
  showMenuButton: boolean;
  onMenuOpen: () => void;
  pageTitle?: string | null;
  showPageTitle: boolean;
  breadcrumbs?: AppHeaderCrumb[];
  noticesOpen: boolean;
  onNoticesToggle: () => void;
  user: AuthUser | null;
  theme: ThemeName;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onManageUsers?: () => void;
  apiOnline: boolean;
  showNotifications?: boolean;
  trailing?: ReactNode;
};

export function AppHeader({
  showMenuButton,
  onMenuOpen,
  pageTitle,
  showPageTitle,
  breadcrumbs,
  noticesOpen,
  onNoticesToggle,
  user,
  theme,
  onToggleTheme,
  onSignOut,
  onManageUsers,
  apiOnline,
  showNotifications = true,
  trailing,
}: AppHeaderProps) {
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;

  return (
    <header className="topbar topbar--utility">
      <div className="topbar-title">
        {showMenuButton ? (
          <button type="button" className="icon-button topbar-menu-btn" onClick={onMenuOpen} aria-label="Open menu">
            <IconMenu size={20} />
          </button>
        ) : null}
        <div className="topbar-heading topbar-heading--plain">
          {hasBreadcrumbs ? (
            <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
              <ol>
                {breadcrumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`}>
                    {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
                    {index < breadcrumbs.length - 1 ? (
                      <span className="topbar-breadcrumb-sep" aria-hidden="true">
                        {" "}
                        /{" "}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {showPageTitle && pageTitle ? <h1>{pageTitle}</h1> : null}
        </div>
      </div>
      <div className="topbar-actions">
        <span
          className={`status-dot api-status-dot topbar-api-status${apiOnline ? " online" : ""}`}
          title={apiOnline ? "API online" : "API offline"}
          aria-label={apiOnline ? "API online" : "API offline"}
        />
        <a className="topbar-support-link" href="mailto:support@mwanga.app">
          Support
        </a>
        <LocaleSwitch />
        {trailing}
        {showNotifications ? (
          <div className="notice-panel">
            <button
              type="button"
              className="icon-button"
              onClick={onNoticesToggle}
              aria-label="Open notifications"
              aria-expanded={noticesOpen}
            >
              <IconBell size={18} />
              <span className="dot" />
            </button>
            {noticesOpen ? (
              <div className="notice-pop card">
                <p className="notice-empty">No notifications</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <AccountMenu
          user={user}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onSignOut={onSignOut}
          onManageUsers={onManageUsers}
          placement="header"
        />
      </div>
    </header>
  );
}