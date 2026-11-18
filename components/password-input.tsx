"use client";

import { useId, useState } from "react";
import { IconEye, IconEyeOff } from "./icons/icon";
import { useT } from "./locale";

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  id?: string;
};

export function PasswordInput({
  value,
  onChange,
  required,
  disabled,
  autoComplete,
  minLength,
  placeholder,
  id: idProp,
}: PasswordInputProps) {
  const t = useT();
  const fallbackId = useId();
  const inputId = idProp ?? fallbackId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="field-password-wrap">
      <input
        id={inputId}
        required={required}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="field-password-toggle"
        disabled={disabled}
        aria-pressed={visible}
        aria-controls={inputId}
        aria-label={visible ? t("aria.hidePassword") : t("aria.showPassword")}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <IconEyeOff size={18} aria-hidden /> : <IconEye size={18} aria-hidden />}
      </button>
    </div>
  );
}