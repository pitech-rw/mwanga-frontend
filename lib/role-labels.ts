import type { LocaleCode } from "./locale-storage";
import { translateEnum } from "./i18n/translate";

/** Friendly label for a `Role.name` or `User.type` slug (falls back for custom role names). */
export function roleOrUserTypeLabel(locale: LocaleCode, slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return "—";
  }
  return translateEnum(locale, normalized);
}