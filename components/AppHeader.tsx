"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/AppSidebar";
import { InterventionStatusBadge } from "@/components/interventions/InterventionStatusBadge";
import { useInterventionHeader } from "@/components/interventions/InterventionHeaderContext";

function InterventionHeaderTitle() {
  const header = useInterventionHeader();
  if (!header) return null;

  return (
    <div className="min-w-0">
      <h1 className="flex flex-wrap items-center gap-2 text-base tracking-tight">
        <span className="truncate font-semibold">{header.name}</span>
        <InterventionStatusBadge status={header.status} />
        {header.readOnly && (
          <span className="text-sm font-normal text-muted">(solo lectura)</span>
        )}
      </h1>
      <p className="text-sm font-normal text-muted">
        {new Date(header.createdAt).toLocaleString("es-ES")}
      </p>
    </div>
  );
}

export function AppHeader() {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const interventionHeader = useInterventionHeader();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            {interventionHeader ? (
              <InterventionHeaderTitle />
            ) : (
              <Link
                href="/"
                className="font-semibold tracking-tight text-foreground"
              >
                RAD TEDAX
              </Link>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 text-sm text-muted">
            {!interventionHeader && session?.user && (
              <span className="hidden sm:inline">{session.user.name}</span>
            )}
            {session?.user && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-surface"
                aria-label="Abrir menú"
              >
                <Menu className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
