"use client";

import Link from "next/link";
import { NavIcon } from "./icons/icon";
import { MENU_ITEMS, type Section } from "../lib/nav";
import { sectionHref } from "../lib/nav-path";

type SidebarNavProps = {
  section: Section;
  counts: Partial<Record<Section, number>>;
  collapsed: boolean;
  /** Base path for account routes, e.g. `/account`. */
  pathPrefix: string;
};

export function SidebarNav({ section, counts, collapsed, pathPrefix }: SidebarNavProps) {
  return (
    <nav className="nav" aria-label="Main">
      {MENU_ITEMS.map((item) => {
        const count = counts[item.id];
        const badge = item.id === "overview" || count === undefined ? "" : String(count);
        const active = section === item.id;
        const href = sectionHref(pathPrefix, item.id);

        return (
          <Link
            key={item.id}
            href={href}
            className={`nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
          >
            <span className="nav-icon-wrap" aria-hidden="true">
              <NavIcon section={item.id} className="nav-icon" size={18} />
              {collapsed && badge ? <span className="nav-dot">{badge}</span> : null}
            </span>
            <span className="nav-label">{item.label}</span>
            {!collapsed && badge ? <span className="nav-count">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
