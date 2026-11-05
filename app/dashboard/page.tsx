"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiResourcePanel } from "../../components/api-resource-panel";
import { AccountMenu } from "../../components/account-menu";
import { SidebarNav } from "../../components/sidebar-nav";
import { IconBatteryCharging, IconBell, IconChevronLeft, IconChevronRight, NavIcon } from "../../components/icons/icon";
import { Badge } from "../../components/badge";
import { BarChart, ProgressBar } from "../../components/bars";
import { DataTable, type Column } from "../../components/data-table";
import { Modal } from "../../components/modal";
import { useTheme } from "../../components/theme";
import { useToast } from "../../components/toast";
import { getApiUrl } from "../../lib/api";
import { userMessageForStatus } from "../../lib/api-errors";
import { authFetch, clearSession, getAccessToken, getStoredUser, type AuthUser } from "../../lib/auth";
import { API_MENU_ITEMS, getMenuItem, MENU_ITEMS, type Section } from "../../lib/nav";
import { batteries, hourlySwaps, notices, stations, type BatteryRow } from "../../lib/ops-data";

type HealthResponse = {
  ok: boolean;
  database: string;
  userCount: number;
  timestamp: string;
};

const sectionCopy: Record<Section, { eyebrow: string; title: string }> = Object.fromEntries(
  MENU_ITEMS.map((item) => [item.id, { eyebrow: item.eyebrow, title: item.title }]),
) as Record<Section, { eyebrow: string; title: string }>;

const apiUrl = getApiUrl();

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { notify } = useToast();
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setSessionUser(getStoredUser());
  }, []);
  const [section, setSection] = useState<Section>("overview");
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<Section, number>>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detail, setDetail] = useState<{ title: string; rows: [string, string][] } | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mwanga-sidebar-collapsed");
      if (stored === "true") {
        setSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("mwanga-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!getAccessToken()) {
        return;
      }

      try {
        const [healthResponse] = await Promise.all([fetch(`${apiUrl}/health`)]);

        if (!healthResponse.ok) {
          throw new Error("The operations API did not respond.");
        }

        if (!active) {
          return;
        }

        setHealth((await healthResponse.json()) as HealthResponse);

        const countResults = await Promise.all(
          API_MENU_ITEMS.map(async (item) => {
            const response = await authFetch(item.apiPath);

            if (!response.ok) {
              return [item.id, 0] as const;
            }

            const data = (await response.json()) as unknown;
            return [item.id, Array.isArray(data) ? data.length : 0] as const;
          }),
        );

        setCounts(Object.fromEntries(countResults) as Partial<Record<Section, number>>);

        setApiError(null);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to reach the API.";
        setApiError(message);
        notify({ title: "API offline", message, tone: "warning" });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [notify, router]);

  const signOut = () => {
    clearSession();
    router.replace("/");
  };

  const handleForbidden = () => {
    clearSession();
    router.replace("/");
  };

  const batteryColumns: Column<BatteryRow>[] = [
    { key: "id", header: "Serial", sortValue: (row) => row.id, render: (row) => row.id },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <Badge status={row.status} /> },
    { key: "station", header: "Station", sortValue: (row) => row.station, render: (row) => row.station },
    { key: "soc", header: "SOC", align: "right", sortValue: (row) => row.soc, render: (row) => `${row.soc}%` },
    { key: "soh", header: "SOH", align: "right", sortValue: (row) => row.soh, render: (row) => `${row.soh}%` },
  ];

  const copy = sectionCopy[section];
  const activeMenu = getMenuItem(section);

  return (
    <div className="app-shell" data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <Image
              src="/assets/mwanga-high-res-logo-grayscale.png"
              alt="Mwanga"
              width={168}
              height={48}
              className="brand-logo"
              priority
            />
            <span className="brand-compact" aria-hidden="true">
              <IconBatteryCharging size={20} />
            </span>
            <span className="brand-tagline">Station ops</span>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
          </button>
        </div>
        <SidebarNav section={section} counts={counts} collapsed={sidebarCollapsed} onSelect={setSection} />
        <div className="sidebar-foot">
          <span className="sidebar-foot-full">
            {health ? `API online · ${health.userCount} users` : "Waiting on the operations API."}
          </span>
          <span className="sidebar-foot-compact" title={health ? "API online" : "API offline"} aria-hidden="true">
            <span className={`status-dot ${health ? "online" : ""}`} />
          </span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-icon" aria-hidden="true">
              <NavIcon section={section} size={22} />
            </span>
            <div>
              <p className="eyebrow">{copy.eyebrow}</p>
              <h1>{copy.title}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="notice-panel">
              <button type="button" className="icon-button" onClick={() => setNoticesOpen((open) => !open)} aria-label="Open notifications">
                <IconBell size={18} />
                <span className="dot" />
              </button>
              {noticesOpen ? (
                <div className="notice-pop card">
                  {notices.map((notice) => (
                    <button
                      key={notice.id}
                      type="button"
                      className="notice-item"
                      onClick={() => {
                        setNoticesOpen(false);
                        notify({ title: notice.title, message: notice.message, tone: notice.tone });
                      }}
                    >
                      <strong>{notice.title}</strong>
                      <p>{notice.message}</p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <AccountMenu
              user={sessionUser}
              theme={theme}
              onToggleTheme={toggleTheme}
              onSignOut={signOut}
              onManageUsers={() => setSection("users")}
            />
          </div>
        </header>

        {apiError ? (
          <div className="banner" role="status">
            <div>
              <strong>Live data is unavailable.</strong>
              <p>{apiError} Fleet tables below use the station sample set.</p>
            </div>
            <button type="button" className="btn" onClick={() => notify({ title: "Still offline", message: apiError, tone: "warning" })}>
              Notify
            </button>
          </div>
        ) : null}

        {section === "overview" ? (
          <>
            <section className="stats">
              <article className="card stat">
                <span>Active riders</span>
                <strong>1,248</strong>
                <em>+8.4% this week</em>
              </article>
              <article className="card stat">
                <span>Batteries in fleet</span>
                <strong>3,420</strong>
                <em>+2.1% charged</em>
              </article>
              <article className="card stat">
                <span>Swaps today</span>
                <strong>486</strong>
                <em>+12.7% vs yesterday</em>
              </article>
              <article className="card stat">
                <span>Revenue</span>
                <strong>CDF 2.84M</strong>
                <em>+6.9% captured</em>
              </article>
            </section>

            <section className="grid-2">
              <article className="card panel">
                <div className="panel-head">
                  <h2>Swap volume</h2>
                  <span>Today, local time</span>
                </div>
                <BarChart items={hourlySwaps} />
              </article>
              <article className="card panel">
                <div className="panel-head">
                  <h2>Station charge</h2>
                  <span>Available share</span>
                </div>
                <div className="bars">
                  {stations.map((station) => (
                    <ProgressBar
                      key={station.id}
                      label={station.name}
                      value={station.available}
                      max={station.capacity}
                      tone={station.online ? "charge" : "danger"}
                    />
                  ))}
                </div>
              </article>
            </section>

            <section className="grid-2">
              <article className="card panel">
                <div className="panel-head">
                  <h2>Battery inventory</h2>
                  <button type="button" className="btn ghost" onClick={() => setSection("batteries")}>
                    View all
                  </button>
                </div>
                <DataTable
                  columns={batteryColumns}
                  rows={batteries}
                  defaultPageSize={4}
                  pageSizeOptions={[4, 10, 25]}
                  searchPlaceholder="Search batteries…"
                  rowKey={(row) => row.id}
                  onRowClick={(row) =>
                    setDetail({
                      title: row.id,
                      rows: [
                        ["Status", row.status],
                        ["Station", row.station],
                        ["State of charge", `${row.soc}%`],
                        ["State of health", `${row.soh}%`],
                      ],
                    })
                  }
                />
              </article>
              <article className="card panel">
                <div className="panel-head">
                  <h2>Pack health</h2>
                  <span>State of charge</span>
                </div>
                <div className="bars">
                  {batteries.map((battery) => (
                    <ProgressBar
                      key={battery.id}
                      label={battery.id}
                      value={battery.soc}
                      tone={battery.soc < 20 ? "danger" : battery.soc < 50 ? "warn" : "charge"}
                    />
                  ))}
                </div>
              </article>
            </section>
          </>
        ) : null}

        {activeMenu.apiPath && section !== "overview" ? (
          <ApiResourcePanel
            section={section}
            apiPath={activeMenu.apiPath}
            title={activeMenu.title}
            onForbidden={handleForbidden}
            onDetail={setDetail}
            onRecordsChange={(count) => setCounts((current) => ({ ...current, [section]: count }))}
            onCreateError={() => notify({ title: "Create failed", message: userMessageForStatus("create", 500), tone: "error" })}
            onCreateSuccess={() => notify({ title: "Created", message: `${activeMenu.title} saved.`, tone: "success" })}
          />
        ) : null}
      </main>

      <Modal open={detail !== null} title={detail?.title ?? "Detail"} onClose={() => setDetail(null)}>
        <div className="detail-list">
          {detail?.rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={() => setDetail(null)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
