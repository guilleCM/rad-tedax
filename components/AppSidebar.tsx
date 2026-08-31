"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { LogOut, MapPin, Moon, Sun, UserPlus, Users, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  canAccessUserAdmin,
  canCreateIntervention,
  canCreateParticipantRegistry,
  roleLabel,
} from "@/lib/services/permissions";
import { Button } from "@/components/ui/forms";
import { CreateIntervinienteDialog } from "@/components/users/CreateIntervinienteDialog";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AppSidebar({ open, onClose }: Props) {
  const { data: session } = useSession();
  const { resolved, setTheme } = useTheme();
  const titleId = useId();
  const isDark = resolved === "dark";
  const role = session?.user?.role;
  const [intervinienteOpen, setIntervinienteOpen] = useState(false);

  const showCreateIntervention = role ? canCreateIntervention(role) : false;
  const showInterviniente = role ? canCreateParticipantRegistry(role) : false;
  const showUserAdmin = role ? canAccessUserAdmin(role) : false;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          aria-label="Cerrar menú"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 h-14">
            <div>
              {session?.user && (
                <p className="mt-1 text-sm text-muted">
                  {session.user.name}
                  {role && (
                    <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs">
                      {roleLabel(role)}
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:bg-surface hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {(showCreateIntervention || showInterviniente) && (
              <section className="mb-4 space-y-2">
                {showCreateIntervention && (
                  <Link
                    href="/interventions/new"
                    onClick={onClose}
                    className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm text-foreground hover:bg-surface"
                  >
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    Crear intervención
                  </Link>
                )}
                {showInterviniente && (
                  <button
                    type="button"
                    onClick={() => setIntervinienteOpen(true)}
                    className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm text-foreground hover:bg-surface"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                    Crear interviniente
                  </button>
                )}
              </section>
            )}

            {showUserAdmin && (
              <section className="mb-4 space-y-2">
                <Link
                  href="/admin/users"
                  onClick={onClose}
                  className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm text-foreground hover:bg-surface"
                >
                  <Users className="h-4 w-4 shrink-0" aria-hidden />
                  Administración de usuarios
                </Link>
              </section>
            )}

            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground">Apariencia</h3>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm text-foreground hover:bg-surface"
              >
                {isDark ? (
                  <Sun className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <Moon className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {isDark ? "Modo claro" : "Modo oscuro"}
              </button>
            </section>
          </div>

          <div className="border-t border-border p-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Salir
            </Button>
          </div>
        </aside>
      </div>

      <CreateIntervinienteDialog
        open={intervinienteOpen}
        onClose={() => setIntervinienteOpen(false)}
      />
    </>
  );
}
