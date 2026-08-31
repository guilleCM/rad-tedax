"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/forms";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function AppHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          Intervención Radiológica
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted">
          {session?.user && (
            <span className="hidden sm:inline">{session.user.name}</span>
          )}
          <ThemeToggle />
          {session?.user && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Salir
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
