"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { IconChevronRight, NavIcon } from "./icons/icon";
import { NAV_MENU_GROUPS, NAV_PRIMARY_ITEMS, NAV_SECONDARY_ITEMS, type MenuItem, type Section } from "../lib/nav";
import { sectionHref } from "../lib/nav-path";

const NAV_GROUPS_STORAGE_KEY = "mwanga-nav-groups-collapsed";

function navGroupSlug(label: string): string {
  return label.replace(/\s+/g, "-").toLowerCase();
}

function readCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(NAV_GROUPS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function persistCollapsedGroups(collapsed: Set<string>) {
  try {
    localStorage.setItem(NAV_GROUPS_STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    /* ignore quota / private mode */
  }
}

type SidebarNavProps = {
  section: Section;
  counts: Partial<Record<Section, number>>;
  collapsed: boolean;
  /** Base path for account routes, e.g. `/account`. */
  pathPrefix: string;
};

function NavLink({
  item,
  active,
  badge,
  collapsed,
  pathPrefix,
  nested,
}: {
  item: MenuItem;
  active: boolean;
  badge: string;
  collapsed: boolean;
  pathPrefix: string;
  nested?: boolean;
}) {
  const href = sectionHref(pathPrefix, item.id);

  return (
    <Link
      href={href}
      className={`nav-item${active ? " active" : ""}${nested ? " nav-item-nested" : ""}`}
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
}

function itemBadge(item: MenuItem, counts: Partial<Record<Section, number>>): string {
  const count = counts[item.id];
  return item.id === "overview" || count === undefined ? "" : String(count);
}

export function SidebarNav({ section, counts, collapsed, pathPrefix }: SidebarNavProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() =>
    typeof window === "undefined" ? new Set() : readCollapsedGroups(),
  );

  const toggleGroup = useCallback((slug: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      persistCollapsedGroups(next);
      return next;
    });
  }, []);

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-block">
        {NAV_PRIMARY_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            active={section === item.id}
            badge={itemBadge(item, counts)}
            collapsed={collapsed}
            pathPrefix={pathPrefix}
          />
        ))}
      </div>

      {NAV_MENU_GROUPS.map((group) => {
        const slug = navGroupSlug(group.label);
        const panelId = `nav-group-panel-${slug}`;
        const groupHasActive = group.items.some((item) => item.id === section);
        const isGroupOpen = collapsed || !collapsedGroups.has(slug) || groupHasActive;

        return (
          <div key={group.label} className="nav-group" data-open={isGroupOpen ? "true" : "false"}>
            {!collapsed ? (
              <button
                type="button"
                className="nav-group-toggle"
                aria-expanded={isGroupOpen}
                aria-controls={panelId}
                onClick={() => toggleGroup(slug)}
              >
                <IconChevronRight
                  className={`nav-group-chevron${isGroupOpen ? " nav-group-chevron-open" : ""}`}
                  size={14}
                  aria-hidden
                />
                <span className="nav-group-label">{group.label}</span>
              </button>
            ) : null}

            <div
              id={panelId}
              className="nav-group-panel"
              {...(!isGroupOpen && !collapsed ? { inert: true as const } : {})}
            >
              <div className={`nav-group-items${collapsed ? "" : " nav-group-items-nested"}`}>
                {(!collapsed ? isGroupOpen : true) &&
                  group.items.map((item) => (
                    <NavLink
                      key={item.id}
                      item={item}
                      active={section === item.id}
                      badge={itemBadge(item, counts)}
                      collapsed={collapsed}
                      pathPrefix={pathPrefix}
                      nested={!collapsed}
                    />
                  ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="nav-divider" role="presentation" aria-hidden />

      <div className="nav-block nav-block-secondary">
        {NAV_SECONDARY_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            item={item}
            active={section === item.id}
            badge={itemBadge(item, counts)}
            collapsed={collapsed}
            pathPrefix={pathPrefix}
          />
        ))}
      </div>
    </nav>
  );
}
