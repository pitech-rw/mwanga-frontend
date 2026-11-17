"use client";

type SidebarApiStatusProps = {
  apiOnline: boolean;
  collapsed: boolean;
};

export function SidebarApiStatus({ apiOnline }: SidebarApiStatusProps) {
  const title = apiOnline ? "API online" : "Waiting on the operations API.";

  return (
    <div className="sidebar-foot">
      <span className="sidebar-foot-full">{title}</span>
      <span className="sidebar-foot-compact" title={title} aria-hidden="true">
        <span className={`status-dot ${apiOnline ? "online" : ""}`} />
      </span>
    </div>
  );
}