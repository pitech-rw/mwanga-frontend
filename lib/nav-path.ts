import { MENU_ITEMS, type Section } from "./nav";

const SECTION_IDS = new Set<string>(MENU_ITEMS.map((item) => item.id));

export function isSectionSegment(value: string): value is Section {
  return SECTION_IDS.has(value);
}

/** Path prefix without trailing slash, e.g. `/account`. */
export function sectionFromPathname(pathname: string, pathPrefix: string): Section {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const rest = pathname === base ? "" : pathname.slice(base.length).replace(/^\/+/, "");
  const segment = rest.split("/")[0] ?? "";

  if (segment === "" || segment === "overview") {
    return "overview";
  }

  if (isSectionSegment(segment)) {
    return segment;
  }

  return "overview";
}

export function sectionHref(pathPrefix: string, section: Section): string {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  if (section === "overview") {
    return base || "/";
  }
  return `${base}/${section}`;
}
