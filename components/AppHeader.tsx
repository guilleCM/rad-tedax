"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/forms";

export function AppHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight text-slate-900">
          Intervención Radiológica
        </Link>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {session?.user && (
            <>
              <span className="hidden sm:inline">{session.user.name}</span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Salir
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
