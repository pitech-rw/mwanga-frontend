"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import {
  bikeCreateOptionLine,
  bikeCreateSearchHaystack,
  bikeEligibleForFleetAttachEdit,
  batteryPlacementTargetFromRow,
  batteryRowBikeId,
  batteryRowIsDeployed,
  batteryRowStationId,
  stationOptionLine,
  stationSearchHaystack,
  type BikeCreateListRow,
  type StationListRow,
} from "../lib/battery-attach-pickers";
import {
  batteryCreateAttachOptionDisabled,
  batteryMayBeAssigned,
  batteryRequiredAttachTarget,
  type BatteryCreateAttachTarget,
} from "../lib/battery-status";
import { localizeField } from "../lib/i18n/localize";
import { getMenuItem } from "../lib/nav";
import { localizedMenuItem } from "../lib/nav-i18n";
import { emptyFileState, mergeUploadedFiles } from "../lib/resource-form-files";
import { buildUpdatePatchPayload, initialValuesForUpdate } from "../lib/resource-edit-payload";
import type { FieldSpec } from "../lib/resource-create-config";
import { RECENT_PICKER_LIMIT, recentPickerOptions } from "../lib/recent-picker";
import { ResourceFormField } from "./resource-form-field";
import { SlideOverDrawer, type SlideOverDrawerTab } from "./slide-over-drawer";
import type { EditResourceTarget } from "./edit-resource-modal";

type EditBatteryModalProps = {
  open: boolean;
  target: EditResourceTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

export function EditBatteryModal({ open, target, onClose, onSaved, onError }: EditBatteryModalProps) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState("details");
  const [batteryAttachTarget, setBatteryAttachTarget] = useState<BatteryCreateAttachTarget>("inventory");
  const [batteryStationId, setBatteryStationId] = useState<number | null>(null);
  const [batteryStationSearch, setBatteryStationSearch] = useState("");
  const [batteryStations, setBatteryStations] = useState<StationListRow[]>([]);
  const [loadingBatteryStations, setLoadingBatteryStations] = useState(false);
  const [batteryBikeId, setBatteryBikeId] = useState<number | null>(null);
  const [batteryBikeSearch, setBatteryBikeSearch] = useState("");
  const [batteryBikes, setBatteryBikes] = useState<BikeCreateListRow[]>([]);
  const [loadingBatteryBikes, setLoadingBatteryBikes] = useState(false);

  const initialPlacement = useMemo(() => {
    if (!target) {
      return {
        target: "inventory" as BatteryCreateAttachTarget,
        stationId: null as number | null,
        bikeId: null as number | null,
        deployed: false,
      };
    }
    const row = target.row;
    return {
      target: batteryPlacementTargetFromRow(row),
      stationId: batteryRowStationId(row),
      bikeId: batteryRowBikeId(row),
      deployed: batteryRowIsDeployed(row),
    };
  }, [target]);

  useEffect(() => {
    if (!open || !target) {
      return;
    }
    setValues(initialValuesForUpdate(target.section, target.row, target.fields));
    setFiles(emptyFileState(target.fields));
    setError(null);
    setDrawerTab("details");
    setBatteryAttachTarget(batteryPlacementTargetFromRow(target.row));
    setBatteryStationId(batteryRowStationId(target.row));
    setBatteryStationSearch("");
    setBatteryBikeId(batteryRowBikeId(target.row));
    setBatteryBikeSearch("");
  }, [open, target]);

  const batteryStatus = values.status?.trim() ?? "";
  const batteryRequiredAttach = batteryRequiredAttachTarget(batteryStatus);

  useEffect(() => {
    if (!open || !batteryRequiredAttach) {
      return;
    }
    if (batteryAttachTarget !== batteryRequiredAttach) {
      setBatteryAttachTarget(batteryRequiredAttach);
    }
  }, [batteryAttachTarget, batteryRequiredAttach, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (batteryAttachTarget === "inventory") {
      if (initialPlacement.target !== "inventory") {
        return;
      }
      setBatteryStationId(null);
      setBatteryBikeId(null);
      return;
    }
    setDrawerTab("attach");
  }, [batteryAttachTarget, initialPlacement.target, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (batteryAttachTarget === "inventory" && drawerTab === "attach") {
      setDrawerTab("details");
    }
  }, [batteryAttachTarget, drawerTab, open]);

  useEffect(() => {
    if (!open || batteryAttachTarget !== "station") {
      return;
    }

    let active = true;
    setLoadingBatteryStations(true);

    const load = async () => {
      try {
        const response = await authFetch("/stations");
        if (!response.ok) {
          if (active) {
            setBatteryStations([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setBatteryStations(Array.isArray(data) ? (data as StationListRow[]) : []);
        setError(null);
      } catch {
        if (active) {
          setBatteryStations([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingBatteryStations(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [batteryAttachTarget, open]);

  useEffect(() => {
    if (!open || batteryAttachTarget !== "bike" || !target) {
      return;
    }

    let active = true;
    setLoadingBatteryBikes(true);
    const batteryId = target.id;
    const currentBikeId = batteryRowBikeId(target.row);

    const load = async () => {
      try {
        const response = await authFetch("/bikes");
        if (!response.ok) {
          if (active) {
            setBatteryBikes([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        const rows = Array.isArray(data) ? (data as BikeCreateListRow[]) : [];
        setBatteryBikes(rows.filter((bike) => bikeEligibleForFleetAttachEdit(bike, batteryId, currentBikeId)));
        setError(null);
      } catch {
        if (active) {
          setBatteryBikes([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingBatteryBikes(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [batteryAttachTarget, open, target]);

  const drawerTabs = useMemo((): SlideOverDrawerTab[] => {
    const tabs: SlideOverDrawerTab[] = [{ id: "details", label: t("create.drawer.tab.batteryDetails") }];
    if (batteryAttachTarget === "station" || batteryAttachTarget === "bike") {
      tabs.push({ id: "attach", label: t("create.drawer.tab.attachTarget") });
    }
    return tabs;
  }, [batteryAttachTarget, t]);

  const useDrawerTabs = drawerTabs.length > 1;
  const showDrawerPanel = (panelId: string) => !useDrawerTabs || drawerTab === panelId;

  const filteredBatteryStations = useMemo(
    () =>
      recentPickerOptions(
        batteryStations,
        batteryStationSearch,
        batteryStationId,
        (station, needle) => stationSearchHaystack(station).includes(needle),
        true,
      ),
    [batteryStationId, batteryStationSearch, batteryStations],
  );

  const selectedBatteryStation = useMemo(
    () =>
      batteryStationId != null ? batteryStations.find((station) => station.id === batteryStationId) : undefined,
    [batteryStationId, batteryStations],
  );

  const filteredBatteryBikes = useMemo(
    () =>
      recentPickerOptions(
        batteryBikes,
        batteryBikeSearch,
        batteryBikeId,
        (bike, needle) => bikeCreateSearchHaystack(bike).includes(needle),
        true,
      ),
    [batteryBikeId, batteryBikeSearch, batteryBikes],
  );

  const selectedBatteryBike = useMemo(
    () => (batteryBikeId != null ? batteryBikes.find((bike) => bike.id === batteryBikeId) : undefined),
    [batteryBikeId, batteryBikes],
  );

  if (!target) {
    return null;
  }

  const { id, fields, row } = target;
  const menu = localizedMenuItem("batteries", t);
  const formId = `edit-battery-${id}`;
  const localizedFields = fields.map((field) => localizeField(field, t));

  const placementChanged =
    batteryAttachTarget !== initialPlacement.target ||
    (batteryAttachTarget === "station" && batteryStationId !== initialPlacement.stationId) ||
    (batteryAttachTarget === "bike" && batteryBikeId !== initialPlacement.bikeId);

  const renderField = (field: FieldSpec) => (
    <ResourceFormField
      key={field.name}
      field={field}
      value={values[field.name] ?? ""}
      disabled={saving}
      onValueChange={(next) => setValues({ ...values, [field.name]: next })}
      file={files[field.name] ?? null}
      onFileChange={(next) => setFiles({ ...files, [field.name]: next })}
      existingFileUrl={null}
    />
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!batteryMayBeAssigned(batteryStatus) && batteryAttachTarget !== "inventory") {
      setError(t("create.error.batteryOfflineNoAssign"));
      setDrawerTab("details");
      return;
    }

    if (batteryStatus === "charging" && batteryAttachTarget !== "station") {
      setError(t("create.error.batteryChargingNeedsStation"));
      setDrawerTab("details");
      return;
    }

    if (batteryStatus === "in_use" && batteryAttachTarget !== "bike") {
      setError(t("create.error.batteryInUseNeedsBike"));
      setDrawerTab("details");
      return;
    }

    if (batteryAttachTarget === "station" && batteryStationId === null) {
      setError(t("create.error.selectAttachStation"));
      setDrawerTab("attach");
      return;
    }

    if (batteryAttachTarget === "bike" && batteryBikeId === null) {
      setError(t("create.error.selectAttachBike"));
      setDrawerTab("attach");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const valuesForPatch = { ...values };
      await mergeUploadedFiles(fields, files, valuesForPatch);

      let body = buildUpdatePatchPayload("batteries", row, fields, valuesForPatch);
      if (body && (body.status === "charging" || body.status === "in_use") && placementChanged) {
        delete body.status;
      }

      const apiPath = `${getMenuItem("batteries").apiPath}/${id}`;

      if (body !== null) {
        const response = await authFetch(apiPath, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const message = await userMessageFromResponse("create", response);
          setError(message);
          onError?.(message);
          return;
        }
      } else if (!placementChanged) {
        setError(t("validation.noChanges"));
        return;
      }

      if (placementChanged) {
        if (batteryAttachTarget === "inventory") {
          if (initialPlacement.deployed || initialPlacement.target !== "inventory") {
            const returnResponse = await authFetch(`/inventory/return/battery/${id}`, { method: "POST" });
            if (!returnResponse.ok) {
              const message = await userMessageFromResponse("create", returnResponse);
              setError(message);
              onError?.(message);
              return;
            }
          }
        } else {
          const attachBody: Record<string, number | string> = {};
          if (batteryAttachTarget === "station" && batteryStationId != null) {
            attachBody.stationId = batteryStationId;
            if (batteryStatus === "charging") {
              attachBody.status = "charging";
            }
          } else if (batteryAttachTarget === "bike" && batteryBikeId != null) {
            attachBody.bikeId = batteryBikeId;
          }

          if (Object.keys(attachBody).length > 0) {
            const attachResponse = await authFetch(apiPath, {
              method: "PATCH",
              body: JSON.stringify(attachBody),
            });
            if (!attachResponse.ok) {
              const message = await userMessageFromResponse("create", attachResponse);
              const detail = t("create.error.batteryCreatedAttachFailed");
              setError(message ? `${detail} ${message}` : detail);
              onError?.(detail);
              return;
            }
          }
        }
      }

      onSaved?.();
      onClose();
    } catch {
      const message = userMessageForNetwork("create");
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOverDrawer
      open={open}
      title={t("modals.edit.title", { label: menu.label })}
      onClose={onClose}
      tabs={useDrawerTabs ? drawerTabs : undefined}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={saving}>
            {saving ? t("common.saving") : t("common.saveChanges")}
          </button>
        </>
      }
    >
      <form id={formId} className="form form-modal-panel" onSubmit={submit}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        {showDrawerPanel("details") ? (
          <>
            <div className="create-attach-target">
              <p className="sub">{t("create.batteries.attachIntro")}</p>
              <div className="drawer-tabs" role="radiogroup" aria-label={t("create.batteries.attachIntro")}>
                {(
                  [
                    { id: "inventory", label: t("create.batteries.attach.inventory") },
                    { id: "station", label: t("create.batteries.attach.station") },
                    { id: "bike", label: t("create.batteries.attach.bike") },
                  ] as const
                ).map((option) => {
                  const selected = batteryAttachTarget === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={saving || batteryCreateAttachOptionDisabled(option.id, batteryStatus)}
                      className={selected ? "drawer-tab drawer-tab-active" : "drawer-tab"}
                      onClick={() => setBatteryAttachTarget(option.id)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {!batteryMayBeAssigned(batteryStatus) && batteryStatus ? (
                <p className="sub" role="status">
                  {t("create.batteries.attach.offlineNote")}
                </p>
              ) : null}
              {batteryStatus === "charging" ? (
                <p className="sub" role="status">
                  {t("create.batteries.attach.chargingNote")}
                </p>
              ) : null}
              {batteryStatus === "in_use" ? (
                <p className="sub" role="status">
                  {t("create.batteries.attach.inUseNote")}
                </p>
              ) : null}
            </div>
            {localizedFields.map((field) => renderField(field))}
          </>
        ) : null}

        {showDrawerPanel("attach") && batteryAttachTarget === "station" ? (
          <>
            <p className="sub">{t("create.batteries.attach.stationHint")}</p>
            <label className="field">
              <span>{t("modals.attachBatteryStation.findStation")}</span>
              <input
                type="search"
                value={batteryStationSearch}
                disabled={saving || loadingBatteryStations}
                onChange={(event) => setBatteryStationSearch(event.target.value)}
                placeholder={t("modals.attachBatteryStation.findStation")}
                autoComplete="off"
                aria-label={t("modals.attachBatteryStation.findStation")}
              />
            </label>
            {loadingBatteryStations ? (
              <p className="sub">{t("modals.picker.loadingStations")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.attachBatteryStation.stationField")} (
                  {t("modals.picker.shownCount", { count: filteredBatteryStations.length })}
                  {!batteryStationSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
                  <span className="col-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                  <span className="sr-only"> {t("common.requiredSr")}</span>
                </span>
                <select
                  value={batteryStationId != null ? String(batteryStationId) : ""}
                  disabled={saving || filteredBatteryStations.length === 0}
                  required
                  onChange={(event) => {
                    const v = event.target.value;
                    setBatteryStationId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredBatteryStations.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label={t("modals.attachBatteryStation.stationField")}
                >
                  <option value="">
                    {filteredBatteryStations.length === 0
                      ? t("common.noMatches")
                      : t("modals.attachBatteryStation.errorSelect")}
                  </option>
                  {filteredBatteryStations.map((station) => (
                    <option key={station.id} value={String(station.id)}>
                      {station.id} · {stationOptionLine(station)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedBatteryStation ? (
              <p className="create-wallet-selection sub" role="status">
                {t("modals.picker.selectedPrefix")}{" "}
                <strong>
                  {selectedBatteryStation.id} · {stationOptionLine(selectedBatteryStation)}
                </strong>
              </p>
            ) : null}
          </>
        ) : null}

        {showDrawerPanel("attach") && batteryAttachTarget === "bike" ? (
          <>
            <p className="sub">{t("create.batteries.attach.bikeHint")}</p>
            <label className="field">
              <span>{t("modals.attachBatteryBike.findBike")}</span>
              <input
                type="search"
                value={batteryBikeSearch}
                disabled={saving || loadingBatteryBikes}
                onChange={(event) => setBatteryBikeSearch(event.target.value)}
                placeholder={t("modals.attachBatteryBike.findBike")}
                autoComplete="off"
                aria-label={t("modals.attachBatteryBike.findBike")}
              />
            </label>
            {loadingBatteryBikes ? (
              <p className="sub">{t("modals.picker.loadingBikes")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.attachBatteryBike.bikeField")} (
                  {t("modals.picker.shownCount", { count: filteredBatteryBikes.length })}
                  {!batteryBikeSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
                  <span className="col-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                  <span className="sr-only"> {t("common.requiredSr")}</span>
                </span>
                <select
                  value={batteryBikeId != null ? String(batteryBikeId) : ""}
                  disabled={saving || filteredBatteryBikes.length === 0}
                  required
                  onChange={(event) => {
                    const v = event.target.value;
                    setBatteryBikeId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredBatteryBikes.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label={t("modals.attachBatteryBike.bikeField")}
                >
                  <option value="">
                    {filteredBatteryBikes.length === 0
                      ? t("modals.attachBikeBattery.noEligible")
                      : t("modals.attachBatteryBike.errorSelect")}
                  </option>
                  {filteredBatteryBikes.map((bike) => (
                    <option key={bike.id} value={String(bike.id)}>
                      {bikeCreateOptionLine(bike)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedBatteryBike ? (
              <p className="create-wallet-selection sub" role="status">
                {t("modals.picker.selectedPrefix")} <strong>{bikeCreateOptionLine(selectedBatteryBike)}</strong>
              </p>
            ) : null}
          </>
        ) : null}
      </form>
    </SlideOverDrawer>
  );
}