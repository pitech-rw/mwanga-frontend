"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiResourcePanel } from "../../components/api-resource-panel";
import { SidebarNav } from "../../components/sidebar-nav";
import { IconBatteryCharging, IconBell, IconChevronLeft, IconChevronRight, IconLogOut, IconMoon, IconSun, NavIcon } from "../../components/icons/icon";
import { Badge } from "../../components/badge";
import { BarChart, ProgressBar } from "../../components/bars";
import { DataTable, type Column } from "../../components/data-table";
import { Modal } from "../../components/modal";
import { useTheme } from "../../components/theme";
import { useToast } from "../../components/toast";
import { getApiUrl } from "../../lib/api";
import { authFetch, clearSession, displayName, getAccessToken, getStoredUser } from "../../lib/auth";
import { API_MENU_ITEMS, getMenuItem, MENU_ITEMS, type Section } from "../../lib/nav";
import { batteries, hourlySwaps, notices, riders, stations, type BatteryRow } from "../../lib/ops-data";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

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

type ApiUser = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  role?: { name: string };
};

function mapUser(row: ApiUser): UserRow {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email;

  return {
    id: row.id,
    name,
    email: row.email,
    role: row.role?.name ?? "member",
    isActive: row.isActive,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { notify } = useToast();
  const [sessionUser] = useState(() => getStoredUser());
  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<Section, number>>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detail, setDetail] = useState<{ title: string; rows: [string, string][] } | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [operatorForm, setOperatorForm] = useState({ name: "", email: "", role: "member" });
  const [savingOperator, setSavingOperator] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    rider: riders[0]?.name ?? "",
    station: stations[0]?.name ?? "",
    notes: "",
  });

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
        const [healthResponse, usersResponse] = await Promise.all([
          fetch(`${apiUrl}/health`),
          authFetch("/users"),
        ]);

        if (!healthResponse.ok) {
          throw new Error("The operations API did not respond.");
        }

        if (!active) {
          return;
        }

        setHealth((await healthResponse.json()) as HealthResponse);

        const countResults = await Promise.all(
          API_MENU_ITEMS.filter((item) => item.id !== "users").map(async (item) => {
            const response = await authFetch(item.apiPath);

            if (!response.ok) {
              return [item.id, 0] as const;
            }

            const data = (await response.json()) as unknown;
            return [item.id, Array.isArray(data) ? data.length : 0] as const;
          }),
        );

        const nextCounts = Object.fromEntries(countResults) as Partial<Record<Section, number>>;

        if (usersResponse.ok) {
          const users = (await usersResponse.json()) as ApiUser[];
          setUsersList(users.map(mapUser));
          nextCounts.users = users.length;
        } else if (usersResponse.status === 401) {
          clearSession();
          router.replace("/");
          return;
        } else {
          setUsersList([]);
          nextCounts.users = 0;
        }

        setCounts(nextCounts);

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

  const needle = query.trim().toLowerCase();
  const matches = (values: string[]) => values.join(" ").toLowerCase().includes(needle);

  const visibleBatteries = useMemo(
    () => batteries.filter((row) => !needle || matches([row.id, row.status, row.station])),
    [needle],
  );
  const handleForbidden = () => {
    clearSession();
    router.replace("/");
  };

  const visibleUsers = useMemo(
    () => usersList.filter((row) => !needle || matches([row.name, row.email, row.role])),
    [needle, usersList],
  );

  const openDispatch = () => setDispatchOpen(true);

  const submitDispatch = (event: FormEvent) => {
    event.preventDefault();
    setDispatchOpen(false);
    notify({
      title: "Battery assigned",
      message: `${dispatchForm.rider} is queued at ${dispatchForm.station}. Payment stays pending until the swap is confirmed.`,
      tone: "success",
    });
  };

  const submitOperator = async (event: FormEvent) => {
    event.preventDefault();
    setSavingOperator(true);

    try {
      const response = await authFetch("/users", {
        method: "POST",
        body: JSON.stringify(operatorForm),
      });

      if (!response.ok) {
        throw new Error("The API rejected this operator.");
      }

      const created = mapUser((await response.json()) as ApiUser);
      setUsersList((current) => [created, ...current]);
      setCounts((current) => ({ ...current, users: (current.users ?? 0) + 1 }));
      setOperatorForm({ name: "", email: "", role: "member" });
      setOperatorOpen(false);
      notify({ title: "User added", message: `${created.name} can sign in as ${created.role}.`, tone: "success" });
    } catch (error) {
      notify({
        title: "Could not save user",
        message: error instanceof Error ? error.message : "Request failed.",
        tone: "error",
      });
    } finally {
      setSavingOperator(false);
    }
  };

  const batteryColumns: Column<BatteryRow>[] = [
    { key: "id", header: "Serial", render: (row) => row.id },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status} /> },
    { key: "station", header: "Station", render: (row) => row.station },
    { key: "soc", header: "SOC", align: "right", render: (row) => `${row.soc}%` },
    { key: "soh", header: "SOH", align: "right", render: (row) => `${row.soh}%` },
  ];

  const userColumns: Column<UserRow>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "email", header: "Email", render: (row) => row.email },
    { key: "role", header: "Role", render: (row) => row.role },
    { key: "status", header: "Status", render: (row) => <Badge status={row.isActive ? "Active" : "Offline"} /> },
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
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search serial, rider, station"
              aria-label="Search"
            />
            <span className="session-chip">{displayName(sessionUser)}</span>
            <button type="button" className="btn icon-text" onClick={toggleTheme}>
              {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button type="button" className="btn ghost icon-text" onClick={signOut}>
              <IconLogOut size={16} />
              Sign out
            </button>
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
            {section === "users" ? (
              <button type="button" className="btn primary" onClick={() => setOperatorOpen(true)}>
                Add user
              </button>
            ) : (
              <button type="button" className="btn primary" onClick={openDispatch}>
                Dispatch battery
              </button>
            )}
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
                  rows={visibleBatteries.slice(0, 4)}
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

        {activeMenu.apiPath && section !== "overview" && section !== "users" ? (
          <ApiResourcePanel
            apiPath={activeMenu.apiPath}
            title={activeMenu.title}
            query={query}
            onForbidden={handleForbidden}
            onDetail={setDetail}
          />
        ) : null}

        {section === "users" ? (
          <article className="card panel">
            <div className="panel-head">
              <h2>User accounts</h2>
              <span>{visibleUsers.length} from the API</span>
            </div>
            <DataTable
              columns={userColumns}
              rows={visibleUsers}
              rowKey={(row) => row.id}
              empty={needle ? "No users match this search." : "No users yet. Add one when the API is reachable."}
              onRowClick={(row) =>
                setDetail({
                  title: row.name,
                  rows: [
                    ["Email", row.email],
                    ["Role", row.role],
                    ["Active", row.isActive ? "Yes" : "No"],
                  ],
                })
              }
            />
          </article>
        ) : null}
      </main>

      <Modal
        open={dispatchOpen}
        title="Dispatch a battery"
        description="Assignment stays pending until the executive confirms collection and installation."
        onClose={() => setDispatchOpen(false)}
      >
        <form className="form" onSubmit={submitDispatch}>
          <label className="field">
            <span>Rider</span>
            <select value={dispatchForm.rider} onChange={(event) => setDispatchForm({ ...dispatchForm, rider: event.target.value })}>
              {riders.map((rider) => (
                <option key={rider.id}>{rider.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Station</span>
            <select value={dispatchForm.station} onChange={(event) => setDispatchForm({ ...dispatchForm, station: event.target.value })}>
              {stations.map((station) => (
                <option key={station.id}>{station.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Note</span>
            <textarea
              rows={3}
              value={dispatchForm.notes}
              onChange={(event) => setDispatchForm({ ...dispatchForm, notes: event.target.value })}
              placeholder="Optional reason for a manual assignment"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setDispatchOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Assign battery
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={operatorOpen}
        title="Add user"
        description="Creates a user on the Mwanga API."
        onClose={() => setOperatorOpen(false)}
      >
        <form className="form" onSubmit={submitOperator}>
          <label className="field">
            <span>Name</span>
            <input
              required
              value={operatorForm.name}
              onChange={(event) => setOperatorForm({ ...operatorForm, name: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              required
              type="email"
              value={operatorForm.email}
              onChange={(event) => setOperatorForm({ ...operatorForm, email: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={operatorForm.role} onChange={(event) => setOperatorForm({ ...operatorForm, role: event.target.value })}>
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="executive">executive</option>
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setOperatorOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={savingOperator}>
              {savingOperator ? "Saving" : "Save user"}
            </button>
          </div>
        </form>
      </Modal>

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
