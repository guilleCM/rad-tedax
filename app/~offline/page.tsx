export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Sin conexión</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        La aplicación no puede cargar esta página sin red. Vuelve a intentarlo
        cuando recuperes la conexión.
      </p>
    </div>
  );
}
