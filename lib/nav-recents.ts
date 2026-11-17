import type { Section } from "./nav";

const STORAGE_KEY = "mwanga-nav-recents";
const MAX_RECENTS = 5;

export function readNavRecents(): Section[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is Section => typeof value === "string");
  } catch {
    return [];
  }
}

export function pushNavRecent(section: Section) {
  if (section === "overview") {
    return;
  }

  try {
    const current = readNavRecents().filter((id) => id !== section);
    const next = [section, ...current].slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}