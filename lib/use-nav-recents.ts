"use client";

import { useCallback, useEffect, useState } from "react";
import type { Section } from "./nav";
import { pushNavRecent, readNavRecents } from "./nav-recents";

export function useNavRecents(section: Section) {
  const [recents, setRecents] = useState<Section[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setRecents(readNavRecents());
    });
  }, []);

  useEffect(() => {
    if (section === "overview") {
      return;
    }
    pushNavRecent(section);
    queueMicrotask(() => {
      setRecents(readNavRecents());
    });
  }, [section]);

  const refresh = useCallback(() => {
    setRecents(readNavRecents());
  }, []);

  return { recents, refresh };
}