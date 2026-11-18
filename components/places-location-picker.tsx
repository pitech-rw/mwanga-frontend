"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  AutocompleteSessionToken,
  GoogleMapsGlobal,
  PlacePrediction,
  PlaceWithAddress,
  PlaceWithLocation,
  PlacesLibrary,
} from "../lib/google-maps-types";

const MAPS_SCRIPT_ID = "google-maps-js-loader";

type PlaceFill = {
  address: string;
  latitude: number;
  longitude: number;
};

type PlacesLocationPickerProps = {
  disabled?: boolean;
  /** Called when the user picks a suggestion with a resolved address and coordinates. */
  onPlaceSelected: (place: PlaceFill) => void;
};

function getApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

let mapsLoader: Promise<void> | null = null;

function loadMapsJsOnce(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (mapsLoader) {
    return mapsLoader;
  }

  mapsLoader = new Promise((resolve, reject) => {
    const g = window as Window & { google?: { maps?: { importLibrary?: (name: string) => Promise<unknown> } } };
    if (g.google?.maps?.importLibrary) {
      resolve();
      return;
    }

    const existing = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    const script =
      existing ??
      (() => {
        const el = document.createElement("script");
        el.id = MAPS_SCRIPT_ID;
        el.async = true;
        el.defer = true;
        el.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
        document.head.appendChild(el);
        return el;
      })();

    const onLoad = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    const onError = () => reject(new Error("Failed to load Google Maps JavaScript API"));

    if (script.dataset.loaded === "true" && g.google?.maps?.importLibrary) {
      resolve();
      return;
    }

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });

  return mapsLoader;
}

/** Google often returns a leading Plus Code in regions with weak street addressing. */
function formattedAddressLooksLikePlusCode(address: string): boolean {
  return /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}(,|\s|$)/i.test(address.trim());
}

function placeDisplayName(place: PlaceWithAddress): string {
  const name = place.displayName;
  return typeof name === "string" ? name.trim() : "";
}

/** Read lat/lng from the Places `Place` object (new API uses LatLng; some builds expose plain numbers). */
function readLatLng(place: PlaceWithLocation): { lat: number; lng: number } | null {
  const loc = place.location;
  if (!loc) {
    return null;
  }
  if (typeof (loc as { lat: unknown }).lat === "function") {
    const l = loc as { lat: () => number; lng: () => number };
    return { lat: l.lat(), lng: l.lng() };
  }
  const literal = loc as { lat: number; lng: number };
  if (typeof literal.lat === "number" && typeof literal.lng === "number") {
    return { lat: literal.lat, lng: literal.lng };
  }
  return null;
}

export function PlacesLocationPicker({ disabled, onPlaceSelected }: PlacesLocationPickerProps) {
  const apiKey = getApiKey();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const sessionTokenRef = useRef<AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const ensureSession = useCallback(async () => {
    const g = window as Window & { google: GoogleMapsGlobal };
    await loadMapsJsOnce(apiKey!);
    const { AutocompleteSessionToken } = (await g.google.maps.importLibrary("places")) as PlacesLibrary;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || disabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loadMapsJsOnce(apiKey);
        if (!cancelled) {
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load Google Maps. Check the API key and network.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, disabled]);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!apiKey || input.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        await ensureSession();
        const g = window as Window & { google: GoogleMapsGlobal };
        const { AutocompleteSuggestion } = (await g.google.maps.importLibrary("places")) as PlacesLibrary;
        const token = sessionTokenRef.current;
        const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: input.trim(),
          sessionToken: token ?? undefined,
        });
        const preds: PlacePrediction[] = [];
        for (const s of raw) {
          if (s.placePrediction) {
            preds.push(s.placePrediction);
          }
        }
        setSuggestions(preds);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
        setLoadError("Place search failed. Ensure Places API is enabled for this key.");
      } finally {
        setLoading(false);
      }
    },
    [apiKey, ensureSession],
  );

  const onInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, 280);
  };

  const predictionLabel = (p: PlacePrediction): string => {
    const main = p.mainText?.text ?? "";
    const sec = p.secondaryText?.text ?? "";
    const full = p.text?.text;
    if (full) {
      return full;
    }
    return sec ? `${main}, ${sec}` : main || p.placeId;
  };

  const addressForStorage = (place: PlaceWithAddress, p: PlacePrediction): string => {
    const formatted = place.formattedAddress?.trim() ?? "";
    const pickedLabel = predictionLabel(p);
    const displayName = placeDisplayName(place);

    if (formatted && !formattedAddressLooksLikePlusCode(formatted)) {
      return formatted;
    }

    if (pickedLabel) {
      return pickedLabel;
    }

    if (displayName) {
      const cityTail = formatted.replace(
        /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3},\s*/i,
        "",
      ).trim();
      return cityTail ? `${displayName}, ${cityTail}` : displayName;
    }

    return formatted || displayName || p.placeId;
  };

  const selectPrediction = async (p: PlacePrediction) => {
    if (!apiKey || disabled) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      await ensureSession();
      const place = p.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "location", "displayName"] });
      const addr = addressForStorage(place, p);
      const ll = readLatLng(place);
      if (!ll) {
        setLoadError("This place has no coordinates. Pick another result or enter lat/lng manually.");
        setLoading(false);
        return;
      }
      onPlaceSelected({ address: addr, latitude: ll.lat, longitude: ll.lng });
      setQuery("");
      setSuggestions([]);
      sessionTokenRef.current = null;
    } catch {
      setLoadError("Could not load place details.");
    } finally {
      setLoading(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="places-picker places-picker--missing-key sub" role="note">
        Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env</code> to enable place search.
      </div>
    );
  }

  return (
    <div className="places-picker field">
      <span>Search place (Google)</span>
      <div className="places-picker-input-wrap">
        <input
          ref={inputRef}
          type="search"
          value={query}
          disabled={disabled}
          autoComplete="off"
          placeholder="Type an address or place name…"
          aria-label="Search for a place"
          aria-controls={suggestions.length > 0 ? listId : undefined}
          aria-expanded={suggestions.length > 0}
          aria-activedescendant={highlight >= 0 ? `${listId}-option-${highlight}` : undefined}
          role="combobox"
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (suggestions.length === 0) {
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && highlight >= 0) {
              e.preventDefault();
              void selectPrediction(suggestions[highlight]!);
            } else if (e.key === "Escape") {
              setSuggestions([]);
              setHighlight(-1);
            }
          }}
        />
        {loading ? <span className="places-picker-status">Searching…</span> : null}
      </div>
      {loadError ? (
        <p className="login-error places-picker-error" role="alert">
          {loadError}
        </p>
      ) : null}
      {suggestions.length > 0 ? (
        <ul id={listId} className="places-picker-list" role="listbox">
          {suggestions.map((p, i) => (
            <li key={p.placeId} id={`${listId}-option-${i}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className="places-picker-option"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void selectPrediction(p)}
              >
                {predictionLabel(p)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="sub places-picker-hint">Select a result to fill address, latitude, and longitude.</p>
    </div>
  );
}
