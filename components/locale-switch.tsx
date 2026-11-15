"use client";

import { useLocale, type LocaleCode } from "./locale";

const OPTIONS: { code: LocaleCode; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
];

export function LocaleSwitch() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="locale-switch" role="group" aria-label="Language">
      {OPTIONS.map((option) => {
        const active = locale === option.code;
        return (
          <button
            key={option.code}
            type="button"
            className={active ? "locale-switch-option locale-switch-option-active" : "locale-switch-option"}
            aria-pressed={active}
            onClick={() => setLocale(option.code)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}