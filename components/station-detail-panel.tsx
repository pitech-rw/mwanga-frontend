"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { sectionHref } from "../lib/nav-path";
import { walletUserLabel } from "../lib/wallet-row-helpers";
import { Badge } from "./badge";
import { DataTable, type Column } from "./data-table";

type StationOperator = {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  type?: string;
  isActive?: boolean;
};

type StationBattery = {
  id: number;
  serialNumber: string;
  status: string;
  soc?: number;
  soh?: number;
  model?: string;
};

type StationSwap = {
  id: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  fee?: string | number;
  user?: Record<string, unknown> | null;
  bike?: Record<string, unknown> | null;
};

type StationDetail = {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  status: string;
  chargingCapacity: number;
  model?: string | null;
  photo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  operators?: StationOperator[];
  batteries?: StationBattery[];
  transactions?: StationSwap[];
};

type StationDetailPanelProps = {
  stationId: number;
  pathPrefix: string;
  onForbidden?: () => void;
};

function formatSwapDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

type TableRow = Record<string, unknown>;

const BATTERY_COLUMNS: Column<TableRow>[] = [
  {
    key: "serial",
    header: "Serial",
    sortValue: (row) => String(row.serial ?? ""),
    render: (row) => String(row.serial ?? "—"),
  },
  {
    key: "status",
    header: "Status",
    sortValue: (row) => String(row.status ?? ""),
    render: (row) => <Badge status={String(row.status ?? "—")} />,
  },
  {
    key: "soc",
    header: "SOC",
    sortValue: (row) => Number(row.soc ?? 0),
    render: (row) => (row.soc != null ? `${row.soc}%` : "—"),
  },
  {
    key: "soh",
    header: "SOH",
    sortValue: (row) => Number(row.soh ?? 0),
    render: (row) => (row.soh != null ? `${row.soh}%` : "—"),
  },
  {
    key: "model",
    header: "Model",
    sortValue: (row) => String(row.model ?? ""),
    render: (row) => String(row.model ?? "—"),
  },
];

const OPERATOR_COLUMNS: Column<TableRow>[] = [
  {
    key: "name",
    header: "Operator",
    sortValue: (row) => String(row.name ?? ""),
    render: (row) => String(row.name ?? "—"),
  },
  {
    key: "username",
    header: "Username",
    sortValue: (row) => String(row.username ?? ""),
    render: (row) => String(row.username ?? "—"),
  },
  {
    key: "email",
    header: "Email",
    sortValue: (row) => String(row.email ?? ""),
    render: (row) => String(row.email ?? "—"),
  },
  {
    key: "active",
    header: "Active",
    sortValue: (row) => String(row.active ?? ""),
    render: (row) => String(row.active ?? "—"),
  },
];

const SWAP_COLUMNS: Column<TableRow>[] = [
  {
    key: "id",
    header: "Swap",
    sortValue: (row) => Number(row.id ?? 0),
    render: (row) => `#${row.id ?? "—"}`,
  },
  {
    key: "rider",
    header: "Rider",
    sortValue: (row) => String(row.rider ?? ""),
    render: (row) => String(row.rider ?? "—"),
  },
  {
    key: "bike",
    header: "Bike",
    sortValue: (row) => String(row.bike ?? ""),
    render: (row) => String(row.bike ?? "—"),
  },
  {
    key: "status",
    header: "Status",
    sortValue: (row) => String(row.status ?? ""),
    render: (row) => <Badge status={String(row.status ?? "—")} />,
  },
  {
    key: "payment",
    header: "Payment",
    sortValue: (row) => String(row.payment ?? ""),
    render: (row) => String(row.payment ?? "—"),
  },
  {
    key: "when",
    header: "When",
    sortValue: (row) => String(row.whenSort ?? ""),
    render: (row) => String(row.when ?? "—"),
  },
];

export function StationDetailPanel({ stationId, pathPrefix, onForbidden }: StationDetailPanelProps) {
  const [station, setStation] = useState<StationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(`/stations/${stationId}`);

        if (response.status === 401 || response.status === 403) {
          onForbidden?.();
          return;
        }

        if (!response.ok) {
          throw new Error(await userMessageFromResponse("load", response));
        }

        if (!active) {
          return;
        }

        setStation((await response.json()) as StationDetail);
      } catch (loadError) {
        if (!active) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : userMessageForNetwork("load");
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [stationId, onForbidden]);

  const batteryRows = useMemo(() => {
    const packs = station?.batteries ?? [];
    return packs.map((battery) => ({
      id: battery.id,
      serial: battery.serialNumber,
      status: battery.status,
      soc: battery.soc,
      soh: battery.soh,
      model: battery.model ?? "—",
    }));
  }, [station?.batteries]);

  const operatorRows = useMemo(() => {
    const operators = station?.operators ?? [];
    return operators.map((op) => ({
      id: op.id,
      name: [op.firstName, op.lastName].filter(Boolean).join(" ").trim() || walletUserLabel(op),
      username: op.username ? `@${op.username}` : "—",
      email: op.email ?? "—",
      active: op.isActive === false ? "No" : "Yes",
    }));
  }, [station?.operators]);

  const swapRows = useMemo(() => {
    const txs = station?.transactions ?? [];
    return txs.map((swap) => {
      const rider =
        swap.user && typeof swap.user === "object" ? walletUserLabel(swap.user as Record<string, unknown>) : "—";
      const bike =
        swap.bike && typeof swap.bike === "object"
          ? (typeof (swap.bike as Record<string, unknown>).plateNumber === "string"
              ? (swap.bike as Record<string, unknown>).plateNumber
              : `Bike #${(swap.bike as Record<string, unknown>).id ?? "—"}`)
          : "—";
      return {
        id: swap.id,
        rider,
        bike,
        status: swap.status,
        payment: swap.paymentStatus,
        when: formatSwapDate(swap.createdAt),
        whenSort: swap.createdAt,
      };
    });
  }, [station?.transactions]);

  const title = station ? `${station.code} — ${station.name}` : `Station #${stationId}`;
  const atStation = batteryRows.length;
  const chargingCapacity = station?.chargingCapacity ?? 0;

  return (
    <article className="card panel station-detail-panel">
      <div className="panel-head">
        <div>
          {station?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- served from API uploads
            <img
              src={station.photo}
              alt=""
              className="station-detail-photo"
              style={{ maxWidth: 240, maxHeight: 140, objectFit: "cover", borderRadius: 8, marginBottom: 12 }}
            />
          ) : null}
          <h2>{title}</h2>
          {station ? (
            <p className="sub">
              {station.address ? `${station.address} · ` : ""}
              Status {station.status} · {atStation} pack{atStation === 1 ? "" : "s"} on site
              {chargingCapacity > 0 ? ` · charging capacity ${chargingCapacity}` : ""}
            </p>
          ) : null}
        </div>
        <Link className="btn" href={sectionHref(pathPrefix, "stations")}>
          Back to stations
        </Link>
      </div>

      {error ? <p className="resource-error">{error}</p> : null}

      <section className="station-detail-section" aria-labelledby="station-batteries-heading">
        <h3 id="station-batteries-heading">Batteries at station</h3>
        <DataTable
          className="data-table-panel"
          columns={BATTERY_COLUMNS}
          rows={batteryRows}
          loading={loading}
          rowKey={(row) => String(row.id)}
          empty={error ? "Unable to load batteries." : "No batteries assigned to this station."}
          searchPlaceholder="Search packs…"
        />
      </section>

      <section className="station-detail-section" aria-labelledby="station-operators-heading">
        <h3 id="station-operators-heading">Assigned operators</h3>
        <DataTable
          className="data-table-panel"
          columns={OPERATOR_COLUMNS}
          rows={operatorRows}
          loading={loading}
          rowKey={(row) => String(row.id)}
          empty={error ? "Unable to load operators." : "No swap operators assigned yet."}
          searchPlaceholder="Search operators…"
        />
      </section>

      <section className="station-detail-section" aria-labelledby="station-swaps-heading">
        <h3 id="station-swaps-heading">Swap transactions</h3>
        <DataTable
          className="data-table-panel"
          columns={SWAP_COLUMNS}
          rows={swapRows}
          loading={loading}
          rowKey={(row) => String(row.id)}
          empty={error ? "Unable to load transactions." : "No swaps recorded at this station yet."}
          searchPlaceholder="Search swaps…"
          defaultSortKey="when"
          defaultSortDirection="desc"
        />
      </section>
    </article>
  );
}