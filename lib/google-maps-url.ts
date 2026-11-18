function parseCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Opens Google Maps search for a row’s coordinates or street address. */
export function googleMapsSearchUrl(record: Record<string, unknown>): string | null {
  const latitude = parseCoord(record.latitude);
  const longitude = parseCoord(record.longitude);

  if (latitude !== null && longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }

  const address = typeof record.address === "string" ? record.address.trim() : "";
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  return null;
}