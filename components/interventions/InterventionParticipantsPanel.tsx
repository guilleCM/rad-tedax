import { Clock, MoreVertical, UserRound } from "lucide-react";
import { Button } from "@/components/ui/forms";
import {
  DoseProgressBar,
  ParticipantAvatar,
} from "@/components/interventions/participant-ui";

export type SerializedParticipant = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  participants: SerializedParticipant[];
};

export function InterventionParticipantsPanel({ participants }: Props) {
  const total = participants.length;
  const active = total;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Intervinientes
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {active} activos de {total} totales
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Dosis máxima permitida (operación)
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              10,00 mSv
            </p>
            <p className="text-xs text-muted">Estimación operativa</p>
          </div>
        </div>

        <DoseProgressBar
          label="Dosis acumulada del equipo"
          valueLabel="0,00 mSv (0% del límite total)"
          percent={0}
          hint="Sin datos de dosimetría"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Lista de intervinientes
          </h2>
          <span className="text-xs text-muted">Ordenar</span>
        </div>

        {participants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">No hay intervinientes asignados.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <ParticipantAvatar name={participant.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {participant.name}
                        </p>
                        <p className="text-xs text-muted">Interviniente</p>
                      </div>
                      <button
                        type="button"
                        disabled
                        title="Próximamente"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted opacity-50"
                        aria-label="Opciones"
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
                        BAJO
                      </span>
                      <span className="text-xs text-muted">
                        Dosis acum. — / —
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                      <div>
                        <dt className="inline">Entrada: </dt>
                        <dd className="inline">—</dd>
                      </div>
                      <div>
                        <dt className="inline">Tiempo en zona: </dt>
                        <dd className="inline">—</dd>
                      </div>
                      <div>
                        <dt className="inline">Tasa área: </dt>
                        <dd className="inline">—</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          disabled
          title="Próximamente"
          className="w-full"
        >
          <Clock className="h-4 w-4" aria-hidden />
          Ver historial
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled
          title="Próximamente"
          className="w-full"
        >
          <UserRound className="h-4 w-4" aria-hidden />
          Relevo / Salida
        </Button>
      </div>
    </div>
  );
}
