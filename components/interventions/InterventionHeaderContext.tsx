"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { InterventionStatus } from "@/lib/types";

export type InterventionHeaderInfo = {
  name: string;
  status: InterventionStatus;
  createdAt: string;
  readOnly?: boolean;
};

type InterventionHeaderContextValue = {
  header: InterventionHeaderInfo | null;
  setHeader: (header: InterventionHeaderInfo | null) => void;
  patchHeader: (patch: Partial<InterventionHeaderInfo>) => void;
};

const InterventionHeaderContext =
  createContext<InterventionHeaderContextValue | null>(null);

export function InterventionHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [header, setHeader] = useState<InterventionHeaderInfo | null>(null);

  const patchHeader = useCallback((patch: Partial<InterventionHeaderInfo>) => {
    setHeader((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({ header, setHeader, patchHeader }),
    [header, patchHeader],
  );

  return (
    <InterventionHeaderContext.Provider value={value}>
      {children}
    </InterventionHeaderContext.Provider>
  );
}

export function useInterventionHeader() {
  const ctx = useContext(InterventionHeaderContext);
  return ctx?.header ?? null;
}

export function usePatchInterventionHeader() {
  const ctx = useContext(InterventionHeaderContext);
  return ctx?.patchHeader ?? (() => {});
}

export function InterventionHeaderSync({
  value,
}: {
  value: InterventionHeaderInfo;
}) {
  const ctx = useContext(InterventionHeaderContext);

  useEffect(() => {
    ctx?.setHeader(value);
    return () => ctx?.setHeader(null);
  }, [
    ctx,
    value.name,
    value.status,
    value.createdAt,
    value.readOnly,
    value,
  ]);

  return null;
}
