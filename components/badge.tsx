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
  cancelled: "danger",
};

export function Badge({ status }: { status: string }) {
  const tone = toneByStatus[status.toLowerCase()] ?? "";
  return <span className={`badge ${tone}`}>{status}</span>;
}
