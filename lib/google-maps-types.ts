/// <reference types="google.maps" />

/** Ambient `google` types are confined here so feature code avoids the global namespace. */
export type GoogleMapsGlobal = typeof google;

export type PlacePrediction = google.maps.places.PlacePrediction;
export type PlacesLibrary = google.maps.PlacesLibrary;
export type AutocompleteSessionToken = google.maps.places.AutocompleteSessionToken;
export type LatLng = google.maps.LatLng;
export type LatLngLiteral = google.maps.LatLngLiteral;

export type PlaceWithLocation = {
  location?: LatLng | LatLngLiteral | null;
};

export type PlaceWithAddress = {
  formattedAddress?: string | null;
  displayName?: string | null;
};