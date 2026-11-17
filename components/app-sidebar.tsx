"use client";

import Image from "next/image";
import Link from "next/link";
import { AgentSidebarNav } from "./agent-sidebar-nav";
import { SidebarNav } from "./sidebar-nav";
import { SidebarRecents } from "./sidebar-recents";
import { SidebarApiStatus } from "./sidebar-api-status";
import { IconBatteryCharging, IconChevronLeft, IconChevronRight } from "./icons/icon";
import type { Section } from "../lib/nav";
import { sectionHref } from "../lib/nav-path";

type AppSidebarProps = {
  variant: "staff" | "agent";
  pathPrefix: string;
  section: Section;
  agentSection?: "topUp" | "agentTransactions" | "riders";
  counts: Partial<Record<Section, number>>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  collapsible: boolean;
  recents: Section[];
  apiOnline: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function AppSidebar({
  variant,
  pathPrefix,
  section,
  agentSection,
  counts,
  collapsed,
  onToggleCollapsed,
  collapsible,
  recents,
  apiOnline,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const homeSection = variant === "agent" ? "topUp" : "overview";
  const homeHref = sectionHref(pathPrefix, homeSection);
  const subtitle = variant === "agent" ? "Agent" : "Station ops";

  const navSection =
    variant === "staff" ? (
      <SidebarNav
        section={section}
        counts={counts}
        collapsed={collapsed}
        pathPrefix={pathPrefix}
      />
    ) : agentSection ? (
      <AgentSidebarNav section={agentSection} pathPrefix={pathPrefix} collapsed={collapsed} />
    ) : null;

  return (
  <>
      {mobileOpen ? (
        <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={onMobileClose} />
      ) : null}
      <aside
        className={`sidebar${variant === "agent" ? " sidebar--agent" : ""}${mobileOpen ? " sidebar--drawer-open" : ""}`}
        aria-hidden={undefined}
      >
        <div className="sidebar-head">
          <Link href={homeHref} className="brand" onClick={onMobileClose}>
            <Image
              src="/assets/logo.png"
              alt="Mwanga"
              width={168}
              height={48}
              className="brand-logo"
              priority
            />
            <span className="brand-compact" aria-hidden="true">
              <IconBatteryCharging size={20} />
            </span>
            {!collapsed ? (
              <>
                <span className="brand-wordmark">Mwanga</span>
                <span className="brand-tagline">{subtitle}</span>
              </>
            ) : null}
          </Link>
          {collapsible ? (
            <button
              type="button"
              className="sidebar-toggle"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
            </button>
          ) : null}
        </div>

        {variant === "staff" ? (
          <SidebarRecents recents={recents} pathPrefix={pathPrefix} collapsed={collapsed} />
        ) : null}

        {navSection}

        <SidebarApiStatus apiOnline={apiOnline} collapsed={collapsed} />
      </aside>
    </>
  );
}