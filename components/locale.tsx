"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTranslator, type TranslateFn } from "../lib/i18n/translate";
import { applyLocale, readLocale, type LocaleCode } from "../lib/locale-storage";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: TranslateFn;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export type { LocaleCode };

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(readLocale);

  const t = useMemo(() => getTranslator(locale), [locale]);

  useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  const setLocale = (next: LocaleCode) => {
    setLocaleState(next);
  };

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return value;
}

export function useT(): TranslateFn {
  return useLocale().t;
}