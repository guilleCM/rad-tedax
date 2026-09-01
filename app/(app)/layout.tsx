import { AppHeader } from "@/components/AppHeader";
import { InterventionHeaderProvider } from "@/components/interventions/InterventionHeaderContext";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <InterventionHeaderProvider>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-2 py-2">{children}</main>
    </InterventionHeaderProvider>
  );
}
