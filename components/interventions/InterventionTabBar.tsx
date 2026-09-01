"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Map, Users } from "lucide-react";

type Props = {
  interventionId: string;
};

const TABS = [
  { segment: "map", label: "Mapa", icon: Map },
  { segment: "intervinientes", label: "Intervinientes", icon: Users },
  { segment: "informe", label: "Informe", icon: FileText },
] as const;

export function InterventionTabBar({ interventionId }: Props) {
  const pathname = usePathname();
  const base = `/interventions/${interventionId}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Navegación de intervención"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-stretch">
        {TABS.map(({ segment, label, icon: Icon }) => {
          const href = `${base}/${segment}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={segment}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
