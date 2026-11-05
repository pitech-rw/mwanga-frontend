"use client";

import { NavIcon } from "./icons/icon";
import { MENU_ITEMS, type Section } from "../lib/nav";

type SidebarNavProps = {
  section: Section;
  counts: Partial<Record<Section, number>>;
  collapsed: boolean;
  onSelect: (section: Section) => void;
};

export function SidebarNav({ section, counts, collapsed, onSelect }: SidebarNavProps) {
  return (
    <nav className="nav" aria-label="Main">
      {MENU_ITEMS.map((item) => {
        const count = counts[item.id];
        const badge = item.id === "overview" || count === undefined ? "" : String(count);
        const active = section === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            onClick={() => onSelect(item.id)}
          >
            <span className="nav-icon-wrap" aria-hidden="true">
              <NavIcon section={item.id} className="nav-icon" size={18} />
              {collapsed && badge ? <span className="nav-dot">{badge}</span> : null}
            </span>
            <span className="nav-label">{item.label}</span>
            {!collapsed && badge ? <span className="nav-count">{badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
