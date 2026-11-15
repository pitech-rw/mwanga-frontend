"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type LocaleCode = "en" | "fr";

const STORAGE_KEY = "mwanga-locale";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): LocaleCode {
  if (typeof document === "undefined") {
    return "en";
  }

  const fromDom = document.documentElement.lang;
  if (fromDom === "fr") {
    return "fr";
  }
  return "en";
}

function applyLocale(locale: LocaleCode) {
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(readLocale);

  useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  const setLocale = (next: LocaleCode) => {
    setLocaleState(next);
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return value;
}