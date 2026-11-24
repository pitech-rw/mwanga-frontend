"use client";

import type { ReactNode } from "react";
import { useT } from "./locale";

type PickerSelectionStatusProps = {
  children: ReactNode;
  onClear: () => void;
  disabled?: boolean;
};

export function PickerSelectionStatus({ children, onClear, disabled }: PickerSelectionStatusProps) {
  const t = useT();

  return (
    <p className="create-wallet-selection sub" role="status">
      <span className="create-wallet-selection-label">
        {t("modals.picker.selectedPrefix")} <strong>{children}</strong>
      </span>
      <button type="button" className="create-wallet-selection-clear" disabled={disabled} onClick={onClear}>
        {t("modals.picker.clearSelection")}
      </button>
    </p>
  );
}