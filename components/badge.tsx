"use client";

import { translateEnum } from "../lib/i18n/translate";
import { useLocale } from "./locale";

const toneByStatus: Record<string, string> = {
  available: "charge",
  active: "charge",
  online: "charge",
  completed: "charge",
  assigned: "info",
  collected: "info",
  installed: "info",
  charging: "warning",
  pending: "warning",
  initiated: "warning",
  faulty: "danger",
  failed: "danger",
  offline: "danger",
  warehouse: "info",
  cancelled: "danger",
};

export function Badge({ status }: { status: string }) {
  const { locale } = useLocale();
  const slug = status.toLowerCase();
  const tone = toneByStatus[slug] ?? "";
  const label = translateEnum(locale, slug);
  return <span className={`badge ${tone}`}>{label}</span>;
}