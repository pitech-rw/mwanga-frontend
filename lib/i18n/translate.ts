import type { LocaleCode } from "../locale-storage";
import { en } from "../../messages/en";
import { fr } from "../../messages/fr";

export type MessageKey = keyof typeof en;

export type TranslateParams = Record<string, string | number>;

export type TranslateFn = (key: MessageKey, params?: TranslateParams) => string;

const catalogs: Record<LocaleCode, Record<string, string>> = { en, fr };

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    return value != null ? String(value) : `{${name}}`;
  });
}

export function translate(locale: LocaleCode, key: MessageKey, params?: TranslateParams): string {
  const template = catalogs[locale][key] ?? en[key];
  if (template == null) {
    return String(key);
  }
  return interpolate(template, params);
}

export function getTranslator(locale: LocaleCode): TranslateFn {
  return (key, params) => translate(locale, key, params);
}

export function translateEnum(locale: LocaleCode, slug: string): string {
  const key = `enums.${slug}` as MessageKey;
  const translated = catalogs[locale][key] ?? en[key];
  if (translated != null) {
    return translated;
  }
  return slug.replace(/_/g, " ");
}

export function translateFieldKey(locale: LocaleCode, key: string): string {
  const messageKey = `fields.keys.${key}` as MessageKey;
  const translated = catalogs[locale][messageKey] ?? en[messageKey];
  if (translated != null) {
    return translated;
  }

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}