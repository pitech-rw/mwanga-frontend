export type LocaleCode = "en" | "fr";

export const LOCALE_STORAGE_KEY = "mwanga-locale";

export function readLocale(): LocaleCode {
  if (typeof document === "undefined") {
    return "en";
  }

  const fromDom = document.documentElement.lang;
  if (fromDom === "fr") {
    return "fr";
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "fr") {
      return "fr";
    }
  } catch {
    /* private mode */
  }

  return "en";
}

export function applyLocale(locale: LocaleCode): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}