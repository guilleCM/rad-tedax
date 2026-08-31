"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/AppSidebar";

export function AppHeader() {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="font-semibold tracking-tight text-foreground"
          >
            RAD TEDAX
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted">
            {session?.user && (
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
