import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessUserAdmin } from "@/lib/services/permissions";
import { UsersAdminPanel } from "@/components/users/UsersAdminPanel";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) notFound();
  if (!canAccessUserAdmin(session.user.role)) redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Intervenciones
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Administración de usuarios
        </h1>
        <p className="text-sm text-muted">
          Gestiona cuentas e intervinientes registrados en el sistema.
        </p>
      </div>

      <UsersAdminPanel
        actorRole={session.user.role}
        actorId={session.user.id}
      />
    </div>
  );
}
