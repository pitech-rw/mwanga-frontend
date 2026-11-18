import type { MessageKey, TranslateFn } from "./i18n/translate";
import { getMenuItem, type MenuItem, type Section } from "./nav";

function navKey(section: Section, part: "label" | "eyebrow" | "title"): MessageKey {
  return `nav.${section}.${part}` as MessageKey;
}

export function localizedMenuItem(section: Section, t: TranslateFn): MenuItem {
  const base = getMenuItem(section);
  return {
    ...base,
    label: t(navKey(section, "label")),
    eyebrow: t(navKey(section, "eyebrow")),
    title: t(navKey(section, "title")),
  };
}

export function localizedGroupLabel(
  groupKey: "network" | "fleetInventory" | "peopleAccess" | "finance",
  t: TranslateFn,
): string {
  return t(`nav.groups.${groupKey}` as MessageKey);
}