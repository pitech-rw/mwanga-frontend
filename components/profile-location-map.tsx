"use client";

type ProfileLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  address: string;
};

function getApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

export function ProfileLocationMap({ latitude, longitude, address }: ProfileLocationMapProps) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  const hasCoords =
    latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const trimmedAddress = address.trim();

  let embedSrc: string | null = null;
  if (hasCoords) {
    embedSrc = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(`${latitude},${longitude}`)}&zoom=15`;
  } else if (trimmedAddress) {
    embedSrc = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(trimmedAddress)}`;
  }

  if (!embedSrc) {
    return null;
  }

  return (
    <div className="profile-location-map-wrap">
      <iframe
        className="profile-location-map"
        title="Map preview"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={embedSrc}
        allowFullScreen
      />
    </div>
  );
}