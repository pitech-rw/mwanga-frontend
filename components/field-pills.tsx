"use client";

import { useId } from "react";

type PillOption = { value: string; label: string };

type FieldPillsProps = {
  label: string;
  value: string;
  options: PillOption[];
  disabled?: boolean;
  required?: boolean;
  /** When set, show a pill that clears the value (e.g. unassign station). */
  emptyValue?: string;
  emptyLabel?: string;
  onChange: (value: string) => void;
  /** Scroll when many options (fleet owners, stations). */
  scrollable?: boolean;
  /** When true, only render the pill group (parent supplies the field label). */
  bare?: boolean;
};

export function FieldPills({
  label,
  value,
  options,
  disabled,
  required,
  emptyValue = "",
  emptyLabel,
  onChange,
  scrollable,
  bare,
}: FieldPillsProps) {
  const groupId = useId();
  const allOptions =
    emptyLabel !== undefined
      ? [{ value: emptyValue, label: emptyLabel }, ...options]
      : options;

  const group = (
    <div
      className={`field-pill-group${scrollable ? " field-pill-group--scroll" : ""}`}
      role="radiogroup"
      aria-labelledby={bare ? undefined : groupId}
      aria-label={bare ? label : undefined}
      aria-required={required}
    >
      {allOptions.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value || "__empty"}
            type="button"
            className="field-pill"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  if (bare) {
    return group;
  }

  return (
    <div className="field field-pills">
      <span id={groupId}>{label}</span>
      {group}
    </div>
  );
}