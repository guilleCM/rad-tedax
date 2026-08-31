import { WifiOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function OfflinePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <WifiOff className="h-8 w-8 text-muted" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold text-foreground">Sin conexión</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        La aplicación no puede cargar esta página sin red. Vuelve a intentarlo
        cuando recuperes la conexión.
      </p>
    </div>
  );
}
