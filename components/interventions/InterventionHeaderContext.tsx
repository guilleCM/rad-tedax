"use client";

import {
  createContext,
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
};

const InterventionHeaderContext =
  createContext<InterventionHeaderContextValue | null>(null);

export function InterventionHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [header, setHeader] = useState<InterventionHeaderInfo | null>(null);
  const value = useMemo(
    () => ({ header, setHeader }),
    [header],
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
