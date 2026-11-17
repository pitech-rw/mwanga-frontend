"use client";

import Link from "next/link";
import { useState } from "react";
import { getMenuItem, type Section } from "../lib/nav";
import { sectionHref } from "../lib/nav-path";
import { IconChevronRight } from "./icons/icon";

type SidebarRecentsProps = {
  recents: Section[];
  pathPrefix: string;
  collapsed: boolean;
};

export function SidebarRecents({ recents, pathPrefix, collapsed }: SidebarRecentsProps) {
  const [open, setOpen] = useState(true);

  if (collapsed || recents.length === 0) {
    return null;
  }

  return (
    <div className="sidebar-recents">
      <button type="button" className="sidebar-recents-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <IconChevronRight
          size={14}
          className={open ? "nav-group-chevron nav-group-chevron-open" : "nav-group-chevron"}
          aria-hidden
        />
        Recents
      </button>
      {open ? (
        <div className="sidebar-recents-list">
          {recents.map((id) => {
            const item = getMenuItem(id);
            return (
              <Link key={id} href={sectionHref(pathPrefix, id)} className="sidebar-recents-link">
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}