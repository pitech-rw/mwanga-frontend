"use client";

import Link from "next/link";
import { AGENT_NAV_ITEMS } from "../lib/nav";
import { sectionHref } from "../lib/nav-path";
import { NavIcon } from "./icons/icon";

type AgentSidebarNavProps = {
  section: "topUp" | "riders";
  pathPrefix: string;
};

export function AgentSidebarNav({ section, pathPrefix }: AgentSidebarNavProps) {
  const active = section;

  return (
    <nav className="nav nav-agent" aria-label="Agent">
      <div className="nav-block">
        {AGENT_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={sectionHref(pathPrefix, item.id)}
            className={`nav-item${active === item.id ? " active" : ""}`}
            aria-current={active === item.id ? "page" : undefined}
          >
            <span className="nav-icon-wrap" aria-hidden="true">
              <NavIcon section={item.id} className="nav-icon" size={18} />
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
