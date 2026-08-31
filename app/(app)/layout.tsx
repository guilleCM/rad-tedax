import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-2 py-2">{children}</main>
    </>
  );
}
