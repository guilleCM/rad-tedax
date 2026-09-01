"use client";

import { useEffect, useState } from "react";

export function useLiveClock(enabled = true, intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  const [prevEnabled, setPrevEnabled] = useState(enabled);

  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    if (enabled) setNow(new Date());
  }

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);

  return now;
}
