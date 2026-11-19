"use client";

import { useT } from "./locale";

import Link from "next/link";
import { AGENT_NAV_ITEMS } from "../lib/nav";
import { filterMenuItems } from "../lib/nav-permissions";
import { localizedMenuItem } from "../lib/nav-i18n";
import { sectionHref } from "../lib/nav-path";
import { NavIcon } from "./icons/icon";

type AgentSidebarNavProps = {
  section: "topUp" | "agentTransactions" | "riders";
  pathPrefix: string;
  permissions: readonly string[];
};

export function AgentSidebarNav({ section, pathPrefix, permissions }: AgentSidebarNavProps) {
  const t = useT();
  const active = section;
  const navItems = filterMenuItems(AGENT_NAV_ITEMS, permissions);

  return (
    <nav className="nav nav-agent" aria-label="Agent">
      <div className="nav-block">
        {navItems.map((item) => {
          const navItem = localizedMenuItem(item.id, t);
          return (
          <Link
            key={item.id}
            href={sectionHref(pathPrefix, item.id)}
            className={`nav-item${active === item.id ? " active" : ""}`}
            aria-current={active === item.id ? "page" : undefined}
          >
            <span className="nav-icon-wrap" aria-hidden="true">
              <NavIcon section={item.id} className="nav-icon" size={18} />
            </span>
            <span className="nav-label">{navItem.label}</span>
          </Link>
          );
        })}
      </div>
    </nav>
  );
}
