"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiResourcePanel } from "./api-resource-panel";
import { AgentTopUpPanel } from "./agent-top-up-panel";
import { AgentTransactionsPanel } from "./agent-transactions-panel";
import { AppHeader, type AppHeaderCrumb } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { RecordDetailModal } from "./record-detail-modal";
import { LocaleSwitch } from "./locale-switch";
import { useTheme } from "./theme";
import { useToast } from "./toast";
import { getApiUrl } from "../lib/api";
import { authFetch, clearSession, getAccessToken, getStoredUser, type AuthUser } from "../lib/auth";
import { AGENT_API_MENU_ITEMS, API_MENU_ITEMS, getMenuItem, type Section } from "../lib/nav";
import {
  companyAccountTransactionsSubRoute,
  sectionFromPathname,
  sectionHref,
  stationDetailSubRoute,
} from "../lib/nav-path";
import { CompanyAccountTransactionsPanel } from "./company-account-transactions-panel";
import { StationDetailPanel } from "./station-detail-panel";
import type { ResourceDetailPayload } from "../lib/resource-detail";
import { useNavRecents } from "../lib/use-nav-recents";

const MOBILE_SHELL_MQ = "(max-width: 980px)";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobileShell, setIsMobileShell] = useState(false);

  const section = sectionFromPathname(pathname, pathPrefix);
  const { recents } = useNavRecents(section);
  const companyAccountTx = companyAccountTransactionsSubRoute(pathname, pathPrefix);
  const stationDetail = stationDetailSubRoute(pathname, pathPrefix);

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
    if (stationDetail) {
      document.title = `Station #${stationDetail.stationId} — Mwanga`;
      return;
    }
    const label = section === "overview" ? "Overview" : item.title;
    document.title = `${label} — Mwanga`;
  }, [section, companyAccountTx, stationDetail]);

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
    const mq = window.matchMedia(MOBILE_SHELL_MQ);
    const apply = () => {
      setIsMobileShell(mq.matches);
      if (!mq.matches) {
        setMobileNavOpen(false);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMobileNavOpen(false));
  }, [pathname]);

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
    : stationDetail
      ? "Station detail"
      : section === "overview"
        ? "Overview"
        : activeMenu.title;
  const breadcrumbLeaf = companyAccountTx
    ? "Transactions"
    : stationDetail
      ? "Station detail"
      : section === "overview"
        ? "Overview"
        : activeMenu.label;
  const isAgent = sessionReady && sessionUser?.type === "agent";
  type AgentSection = "topUp" | "agentTransactions" | "riders";
  const agentSection: AgentSection =
    section === "riders" ? "riders" : section === "agentTransactions" ? "agentTransactions" : "topUp";

  useEffect(() => {
    if (!isAgent) {
      return;
    }
    if (section !== "topUp" && section !== "riders" && section !== "agentTransactions") {
      router.replace(sectionHref(pathPrefix, "topUp"));
    }
  }, [isAgent, section, router, pathPrefix]);

  if (!sessionReady) {
    return <div className="app-shell" />;
  }

  const navSectionKey = companyAccountTx || stationDetail ? "stations" : section;
  const apiOnline = Boolean(health?.ok);

  const staffBreadcrumbs = (): AppHeaderCrumb[] | undefined => {
    if (section === "overview" && !companyAccountTx && !stationDetail) {
      return undefined;
    }
    const crumbs: AppHeaderCrumb[] = [{ href: accountHome, label: "Account" }];
    if (companyAccountTx) {
      crumbs.push({ href: sectionHref(pathPrefix, "companyAccounts"), label: "Company accounts" });
      crumbs.push({ label: "Transactions" });
      return crumbs;
    }
    if (stationDetail) {
      crumbs.push({ href: sectionHref(pathPrefix, "stations"), label: "Stations" });
      crumbs.push({ label: "Station detail" });
      return crumbs;
    }
    if (section !== "overview") {
      crumbs.push({ label: breadcrumbLeaf });
    }
    return crumbs;
  };

  const headerAuthProps = {
    user: sessionUser,
    theme,
    onToggleTheme: toggleTheme,
    onSignOut: signOut,
    apiOnline,
  };

  const shellProps = {
    pathPrefix,
    apiOnline,
    mobileOpen: mobileNavOpen,
    onMobileClose: () => setMobileNavOpen(false),
    recents,
    counts,
    collapsed: isAgent ? false : sidebarCollapsed,
    onToggleCollapsed: () => setSidebarCollapsed((value) => !value),
    collapsible: !isAgent && !isMobileShell,
    section: navSectionKey,
  };

  if (isAgent) {
    const agentMenu = getMenuItem(agentSection);
    const agentTitle = agentMenu.title;

    return (
      <div
        className={`app-shell${isMobileShell ? " app-shell--mobile" : ""}${mobileNavOpen ? " app-shell--nav-open" : ""}`}
        data-sidebar-collapsed="false"
      >
        <AppSidebar {...shellProps} variant="agent" agentSection={agentSection} />
        <main className="workspace">
          <AppHeader
            showMenuButton={isMobileShell}
            onMenuOpen={() => setMobileNavOpen(true)}
            pageTitle={agentTitle}
            showPageTitle
            breadcrumbs={[
              { href: sectionHref(pathPrefix, "topUp"), label: "Agent" },
              { label: agentMenu.label },
            ]}
            noticesOpen={false}
            onNoticesToggle={() => undefined}
            showNotifications={false}
            {...headerAuthProps}
          />

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
          ) : agentSection === "agentTransactions" ? (
            <AgentTransactionsPanel reloadKey={resourceReloadKey} onForbidden={handleForbidden} />
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
              onWalletTopUpSuccess={() => {
                bumpResourceReload();
                notify({ title: "Wallet updated", message: "Top-up applied from your float.", tone: "success" });
              }}
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

  const showStaffTitle = true;

  return (
    <div
      className={`app-shell${isMobileShell ? " app-shell--mobile" : ""}${mobileNavOpen ? " app-shell--nav-open" : ""}`}
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
    >
      <AppSidebar {...shellProps} variant="staff" />

      <main className="workspace">
        <AppHeader
          showMenuButton={isMobileShell}
          onMenuOpen={() => setMobileNavOpen(true)}
          pageTitle={pageTitle}
          showPageTitle={showStaffTitle}
          breadcrumbs={staffBreadcrumbs()}
          noticesOpen={noticesOpen}
          onNoticesToggle={() => setNoticesOpen((open) => !open)}
          onManageUsers={() => router.push(sectionHref(pathPrefix, "users"))}
          {...headerAuthProps}
        />

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

        {section === "overview" && !companyAccountTx && !stationDetail ? (
          <section className="stats" aria-label="Key metrics">
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

        {stationDetail ? (
          <StationDetailPanel
            stationId={stationDetail.stationId}
            pathPrefix={pathPrefix}
            onForbidden={handleForbidden}
          />
        ) : null}

        {activeMenu.apiPath && section !== "overview" && !companyAccountTx && !stationDetail ? (
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
              notify({ title: "Assignment saved", message: "Assignment updated.", tone: "success" })
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
              if (section === "users") {
                notify({
                  title: "User deactivated",
                  message: "Sign-in disabled. The account stays in the list as inactive.",
                  tone: "success",
                });
              } else {
                notify({ title: "Record deleted", message: "Removed from the list.", tone: "success" });
              }
            }}
            onResourceDeleteError={(message) => notify({ title: "Delete failed", message, tone: "error" })}
          />
        ) : null}
      </main>

      <RecordDetailModal open={detail !== null} payload={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
