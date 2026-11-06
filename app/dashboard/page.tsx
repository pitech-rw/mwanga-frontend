"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiResourcePanel } from "../../components/api-resource-panel";
import { AccountMenu } from "../../components/account-menu";
import { SidebarNav } from "../../components/sidebar-nav";
import { IconBatteryCharging, IconBell, IconChevronLeft, IconChevronRight, NavIcon } from "../../components/icons/icon";
import { RecordDetailModal } from "../../components/record-detail-modal";
import { useTheme } from "../../components/theme";
import { useToast } from "../../components/toast";
import { getApiUrl } from "../../lib/api";
import { authFetch, clearSession, getAccessToken, getStoredUser, type AuthUser } from "../../lib/auth";
import { API_MENU_ITEMS, getMenuItem, MENU_ITEMS, type Section } from "../../lib/nav";
import type { ResourceDetailPayload } from "../../lib/resource-detail";
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
  const [detail, setDetail] = useState<ResourceDetailPayload | null>(null);
  const [resourceReloadKey, setResourceReloadKey] = useState(0);
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

  const bumpResourceReload = useCallback(() => {
    setResourceReloadKey((k) => k + 1);
  }, []);

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
                  <p className="notice-empty">No notifications</p>
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

        {activeMenu.apiPath && section !== "overview" ? (
          <ApiResourcePanel
            section={section}
            apiPath={activeMenu.apiPath}
            title={activeMenu.title}
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
            onWalletEditSuccess={() => {
              bumpResourceReload();
              notify({ title: "Wallet updated", message: "Wallet saved.", tone: "success" });
            }}
            onWalletEditError={(message) => notify({ title: "Update failed", message, tone: "error" })}
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
