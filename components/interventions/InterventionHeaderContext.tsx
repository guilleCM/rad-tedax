"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { InterventionStatus } from "@/lib/types";

export type InterventionHeaderInfo = {
  name: string;
  status: InterventionStatus;
  createdAt: string;
  readOnly?: boolean;
};

export type InterventionSaveState = "idle" | "saving" | "saved";

type InterventionHeaderContextValue = {
  header: InterventionHeaderInfo | null;
  setHeader: (header: InterventionHeaderInfo | null) => void;
  patchHeader: (patch: Partial<InterventionHeaderInfo>) => void;
  saveState: InterventionSaveState;
  reportSaveState: (state: InterventionSaveState) => void;
};

const InterventionHeaderContext =
  createContext<InterventionHeaderContextValue | null>(null);

const SAVED_RESET_MS = 2000;

export function InterventionHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [header, setHeader] = useState<InterventionHeaderInfo | null>(null);
  const [saveState, setSaveState] = useState<InterventionSaveState>("idle");
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patchHeader = useCallback((patch: Partial<InterventionHeaderInfo>) => {
    setHeader((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const reportSaveState = useCallback((state: InterventionSaveState) => {
    if (savedResetRef.current) {
      clearTimeout(savedResetRef.current);
      savedResetRef.current = null;
    }

    setSaveState(state);

    if (state === "saved") {
      savedResetRef.current = setTimeout(() => {
        setSaveState("idle");
        savedResetRef.current = null;
      }, SAVED_RESET_MS);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (savedResetRef.current) clearTimeout(savedResetRef.current);
    };
  }, []);

  const value = useMemo(
    () => ({ header, setHeader, patchHeader, saveState, reportSaveState }),
    [header, patchHeader, saveState, reportSaveState],
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

export function useInterventionSaveState() {
  const ctx = useContext(InterventionHeaderContext);
  return ctx?.saveState ?? "idle";
}

export function useReportInterventionSave() {
  const ctx = useContext(InterventionHeaderContext);
  return ctx?.reportSaveState ?? (() => {});
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
