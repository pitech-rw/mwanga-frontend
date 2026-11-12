"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiResourcePanel } from "./api-resource-panel";
import { AgentTopUpPanel } from "./agent-top-up-panel";
import { AgentSidebarNav } from "./agent-sidebar-nav";
import { AccountMenu } from "./account-menu";
import { SidebarNav } from "./sidebar-nav";
import { IconBatteryCharging, IconBell, IconChevronLeft, IconChevronRight } from "./icons/icon";
import { RecordDetailModal } from "./record-detail-modal";
import { useTheme } from "./theme";
import { useToast } from "./toast";
import { getApiUrl } from "../lib/api";
import { authFetch, clearSession, getAccessToken, getStoredUser, type AuthUser } from "../lib/auth";
import { AGENT_API_MENU_ITEMS, API_MENU_ITEMS, getMenuItem, type Section } from "../lib/nav";
import { companyAccountTransactionsSubRoute, sectionFromPathname, sectionHref } from "../lib/nav-path";
import { CompanyAccountTransactionsPanel } from "./company-account-transactions-panel";
import type { ResourceDetailPayload } from "../lib/resource-detail";

type HealthResponse = {
  ok: boolean;
  database: string;
  userCount: number;
  timestamp: string;
};

const apiUrl = getApiUrl();

type AccountWorkspaceProps = {
  /** e.g. `/account` — used for links and breadcrumbs */
  pathPrefix: string;
};

export function AccountWorkspace({ pathPrefix }: AccountWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { notify } = useToast();
  /** Must match SSR (null / false) so avatar and layout hydrate; sync from storage after mount. */
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<Section, number>>>({});
  const [detail, setDetail] = useState<ResourceDetailPayload | null>(null);
  const [resourceReloadKey, setResourceReloadKey] = useState(0);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const section = sectionFromPathname(pathname, pathPrefix);
  const companyAccountTx = companyAccountTransactionsSubRoute(pathname, pathPrefix);

  useEffect(() => {
    queueMicrotask(() => {
      setSessionUser(getStoredUser());
      setSessionReady(true);
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (localStorage.getItem("mwanga-sidebar-collapsed") === "true") {
          setSidebarCollapsed(true);
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    const item = getMenuItem(section);
    if (companyAccountTx) {
      document.title = `Transactions · Company account #${companyAccountTx.accountId} — Mwanga`;
      return;
    }
    const label = section === "overview" ? "Overview" : item.title;
    document.title = `${label} — Mwanga`;
  }, [section, companyAccountTx]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    try {
      localStorage.setItem("mwanga-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    let active = true;
    const isAgentUser = sessionUser?.type === "agent";
    const countMenuItems = isAgentUser ? AGENT_API_MENU_ITEMS : API_MENU_ITEMS;

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
          countMenuItems.map(async (item) => {
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
  }, [notify, sessionReady, sessionUser?.type]);

  const signOut = () => {
    clearSession();
    router.replace("/");
  };

  const handleForbidden = () => {
    clearSession();
    router.replace("/");
  };

  const bumpResourceReload = useCallback(() => {
    setResourceReloadKey((k) => k + 1);
  }, []);

  const activeMenu = getMenuItem(section);
  const accountHome = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const pageTitle = companyAccountTx
    ? "Transactions"
  : section === "overview"
    ? "Overview"
    : activeMenu.title;
  const breadcrumbLeaf = companyAccountTx
    ? "Transactions"
    : section === "overview"
      ? "Overview"
      : activeMenu.label;
  const isAgent = sessionReady && sessionUser?.type === "agent";
  const agentSection: "topUp" | "riders" = section === "riders" ? "riders" : "topUp";

  useEffect(() => {
    if (!isAgent) {
      return;
    }
    if (section !== "topUp" && section !== "riders") {
      router.replace(sectionHref(pathPrefix, "topUp"));
    }
  }, [isAgent, section, router, pathPrefix]);

  if (!sessionReady) {
    return <div className="app-shell" />;
  }

  if (isAgent) {
    const agentMenu = getMenuItem(agentSection);
    const agentTitle = agentMenu.title;
    const agentBreadcrumb = agentMenu.label;

    return (
      <div className="app-shell" data-sidebar-collapsed="false">
        <aside className="sidebar sidebar--agent">
          <div className="sidebar-head">
            <div className="brand">
              <Image
                src="/assets/logo.png"
                alt="Mwanga"
                width={168}
                height={48}
                className="brand-logo"
                priority
              />
              <span className="brand-tagline">Agent</span>
            </div>
          </div>
          <AgentSidebarNav section={agentSection} pathPrefix={pathPrefix} />
          <div className="sidebar-foot">
            <span className="sidebar-foot-full">
              {health ? "API online" : "Waiting on the API."}
            </span>
            <span className="sidebar-foot-compact" title={health ? "API online" : "API offline"} aria-hidden="true">
              <span className={`status-dot ${health ? "online" : ""}`} />
            </span>
          </div>
        </aside>
        <main className="workspace">
          <header className="topbar">
            <div className="topbar-title">
              <div className="topbar-heading">
                <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
                  <ol>
                    <li>
                      <Link href={sectionHref(pathPrefix, "topUp")}>Agent</Link>
                    </li>
                    <li className="topbar-breadcrumb-sep" aria-hidden="true">
                      /
                    </li>
                    <li className="topbar-breadcrumb-current">{agentBreadcrumb}</li>
                  </ol>
                </nav>
                <h1>{agentTitle}</h1>
              </div>
            </div>
            <div className="topbar-actions">
              <AccountMenu user={sessionUser} theme={theme} onToggleTheme={toggleTheme} onSignOut={signOut} />
            </div>
          </header>

          {apiError ? (
            <div className="banner" role="status">
              <div>
                <strong>Live data is unavailable.</strong>
                <p>{apiError}</p>
              </div>
            </div>
          ) : null}

          {agentSection === "topUp" ? (
            <AgentTopUpPanel />
          ) : (
            <ApiResourcePanel
              section="riders"
              apiPath="/users/riders"
              title={agentMenu.title}
              reloadKey={resourceReloadKey}
              onForbidden={handleForbidden}
              onDetail={setDetail}
              onRecordsChange={(count) => setCounts((current) => ({ ...current, riders: count }))}
              onCreateError={(message) => notify({ title: "Create failed", message, tone: "error" })}
              onWalletTopUpSuccess={() =>
                notify({ title: "Wallet updated", message: "Top-up applied from your float.", tone: "success" })
              }
              onWalletTopUpError={(message) => notify({ title: "Top-up failed", message, tone: "error" })}
              onResourceEditError={(message) => notify({ title: "Update failed", message, tone: "error" })}
              onResourceDeleteError={(message) => notify({ title: "Delete failed", message, tone: "error" })}
            />
          )}
        </main>

        <RecordDetailModal open={detail !== null} payload={detail} onClose={() => setDetail(null)} />
      </div>
    );
  }

  return (
    <div className="app-shell" data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
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
        <SidebarNav
          section={companyAccountTx ? "companyAccounts" : section}
          counts={counts}
          collapsed={sidebarCollapsed}
          pathPrefix={pathPrefix}
        />
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
            <div className="topbar-heading">
              <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
                <ol>
                  <li>
                    <Link href={accountHome}>Account</Link>
                  </li>
                  <li className="topbar-breadcrumb-sep" aria-hidden="true">
                    /
                  </li>
                  {companyAccountTx ? (
                    <>
                      <li>
                        <Link href={sectionHref(pathPrefix, "companyAccounts")}>Company accounts</Link>
                      </li>
                      <li className="topbar-breadcrumb-sep" aria-hidden="true">
                        /
                      </li>
                      <li className="topbar-breadcrumb-current">Transactions</li>
                    </>
                  ) : (
                    <li className="topbar-breadcrumb-current">{breadcrumbLeaf}</li>
                  )}
                </ol>
              </nav>
              <h1>{pageTitle}</h1>
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
                  <p className="notice-empty">No notifications</p>
                </div>
              ) : null}
            </div>
            <AccountMenu
              user={sessionUser}
              theme={theme}
              onToggleTheme={toggleTheme}
              onSignOut={signOut}
              onManageUsers={() => router.push(sectionHref(pathPrefix, "users"))}
            />
          </div>
        </header>

        {apiError ? (
          <div className="banner" role="status">
            <div>
              <strong>Live data is unavailable.</strong>
              <p>{apiError}</p>
            </div>
            <button type="button" className="btn" onClick={() => notify({ title: "Still offline", message: apiError, tone: "warning" })}>
              Notify
            </button>
          </div>
        ) : null}

        {section === "overview" ? (
          <section className="stats">
            <article className="card stat">
              <span>Batteries</span>
              <strong>{counts.batteries != null ? counts.batteries.toLocaleString() : "—"}</strong>
            </article>
            <article className="card stat">
              <span>Bikes</span>
              <strong>{counts.bikes != null ? counts.bikes.toLocaleString() : "—"}</strong>
            </article>
            <article className="card stat">
              <span>Swaps</span>
              <strong>{counts.swaps != null ? counts.swaps.toLocaleString() : "—"}</strong>
            </article>
            <article className="card stat">
              <span>Stations</span>
              <strong>{counts.stations != null ? counts.stations.toLocaleString() : "—"}</strong>
            </article>
          </section>
        ) : null}

        {companyAccountTx ? (
          <CompanyAccountTransactionsPanel
            accountId={companyAccountTx.accountId}
            pathPrefix={pathPrefix}
            onForbidden={handleForbidden}
          />
        ) : null}

        {activeMenu.apiPath && section !== "overview" && !companyAccountTx ? (
          <ApiResourcePanel
            section={section}
            apiPath={activeMenu.apiPath}
            title={activeMenu.title}
            pathPrefix={pathPrefix}
            reloadKey={resourceReloadKey}
            onForbidden={handleForbidden}
            onDetail={setDetail}
            onRecordsChange={(count) => setCounts((current) => ({ ...current, [section]: count }))}
            onCreateError={(message) => notify({ title: "Create failed", message, tone: "error" })}
            onCreateSuccess={() => notify({ title: "Created", message: `${activeMenu.title} saved.`, tone: "success" })}
            onAssignSuccess={() =>
              notify({ title: "Assignment saved", message: "Swapper station assignment updated.", tone: "success" })
            }
            onAssignError={(message) => notify({ title: "Assignment failed", message, tone: "error" })}
            onBatteryStationSuccess={() => {
              bumpResourceReload();
              notify({ title: "Station updated", message: "Battery attached to the selected station.", tone: "success" });
            }}
            onBatteryStationError={(message) => notify({ title: "Attach failed", message, tone: "error" })}
            onBatteryBikeSuccess={() => {
              bumpResourceReload();
              notify({ title: "Bike updated", message: "Battery attached to the selected bike.", tone: "success" });
            }}
            onBatteryBikeError={(message) => notify({ title: "Attach failed", message, tone: "error" })}
            onBikeRiderSuccess={() => {
              bumpResourceReload();
              notify({ title: "Bike updated", message: "Rider assignment saved.", tone: "success" });
            }}
            onBikeRiderError={(message) => notify({ title: "Assignment failed", message, tone: "error" })}
            onCardRiderSuccess={() => {
              bumpResourceReload();
              notify({ title: "Card updated", message: "Rider assignment saved.", tone: "success" });
            }}
            onCardRiderError={(message) => notify({ title: "Assignment failed", message, tone: "error" })}
            onWalletTopUpSuccess={() => {
              bumpResourceReload();
              notify({ title: "Wallet updated", message: "Balance topped up.", tone: "success" });
            }}
            onWalletTopUpError={(message) => notify({ title: "Top-up failed", message, tone: "error" })}
            onWalletDeleteSuccess={() => {
              bumpResourceReload();
              notify({ title: "Wallet deleted", message: "Wallet removed.", tone: "success" });
            }}
            onWalletDeleteError={(message) => notify({ title: "Delete failed", message, tone: "error" })}
            onResourceEditSuccess={() => {
              bumpResourceReload();
              notify({ title: "Record updated", message: "Changes saved.", tone: "success" });
            }}
            onResourceEditError={(message) => notify({ title: "Update failed", message, tone: "error" })}
            onResourceDeleteSuccess={() => {
              bumpResourceReload();
              notify({ title: "Record deleted", message: "Removed from the list.", tone: "success" });
            }}
            onResourceDeleteError={(message) => notify({ title: "Delete failed", message, tone: "error" })}
          />
        ) : null}
      </main>

      <RecordDetailModal open={detail !== null} payload={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
