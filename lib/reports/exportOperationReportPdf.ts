import type { OperationHistoryEvent } from "@/domain/dosimetry/buildOperationHistory";
import type { OperationReportSnapshot } from "@/domain/dosimetry/buildOperationReport";
import {
  formatAccumulatedDose,
  formatAccumulatedDoseMsv,
  formatDoseValue,
} from "@/lib/dosimetry/formatOperationDose";
import {
  formatZoneILimit,
  formatZoneIILimit,
} from "@/lib/zones/formatDoseLimit";
import { beltCopy } from "@/domain/zones/inverseSquare";
import { formatAnnotationTime } from "@/domain/dosimetry/annotations";
import type { ActiveZone } from "@/lib/types";
import {
  MAP_SNAPSHOT_HEIGHT,
  MAP_SNAPSHOT_WIDTH,
} from "@/lib/map/interventionMapShared";

const ZONE_LABELS: Record<ActiveZone, string> = {
  I: "Zona I",
  II: "Zona II",
};

function formatDurationHms(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

const PAGE_MARGIN = 16;
const LINE_HEIGHT = 6;
const PAGE_HEIGHT = 297;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function formatMaxDoseRate(rateMsvPerHour: number): string {
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rateMsvPerHour >= 1 ? rateMsvPerHour : rateMsvPerHour * 1000);
  return rateMsvPerHour >= 1
    ? `${formatted} mSv/h`
    : `${formatted} µSv/h`;
}

function describeTimelineEvent(event: OperationHistoryEvent): string {
  switch (event.type) {
    case "participant_added":
      return "Añadido a la operación";
    case "session_start":
      return `Entrada en ${ZONE_LABELS[event.zone!]}`;
    case "zone_change":
      return `Cambio a ${ZONE_LABELS[event.zone!]}`;
    case "session_end":
      return `Salida de zona · ${formatDurationHms(event.durationSeconds ?? 0)} · ${formatAccumulatedDoseMsv(event.doseMsv ?? 0)}`;
    case "session_active":
      return `En zona · ${ZONE_LABELS[event.zone!]}`;
  }
}

function statusLabel(status: OperationReportSnapshot["operation"]["status"]): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "active":
      return "En curso";
    case "closed":
      return "Cerrada";
  }
}

type PdfWriter = {
  doc: import("jspdf").jsPDF;
  y: number;
};

function ensureSpace(writer: PdfWriter, needed = LINE_HEIGHT): void {
  if (writer.y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
    writer.doc.addPage();
    writer.y = PAGE_MARGIN;
  }
}

function writeLine(writer: PdfWriter, text: string, options?: { bold?: boolean }) {
  ensureSpace(writer);
  if (options?.bold) {
    writer.doc.setFont("helvetica", "bold");
  } else {
    writer.doc.setFont("helvetica", "normal");
  }
  writer.doc.setFontSize(10);
  const lines = writer.doc.splitTextToSize(text, CONTENT_WIDTH);
  for (const line of lines) {
    ensureSpace(writer);
    writer.doc.text(line, PAGE_MARGIN, writer.y);
    writer.y += LINE_HEIGHT;
  }
}

function writeSectionTitle(writer: PdfWriter, title: string) {
  writer.y += 2;
  writeLine(writer, title, { bold: true });
}

function writeMapImage(
  writer: PdfWriter,
  mapImageDataUrl: string,
): void {
  const imgWidth = CONTENT_WIDTH;
  const imgHeight = (imgWidth * MAP_SNAPSHOT_HEIGHT) / MAP_SNAPSHOT_WIDTH;
  const blockHeight = imgHeight + LINE_HEIGHT * 2;

  ensureSpace(writer, blockHeight);
  writer.doc.addImage(
    mapImageDataUrl,
    "JPEG",
    PAGE_MARGIN,
    writer.y,
    imgWidth,
    imgHeight,
  );
  writer.y += imgHeight + 4;
  writeLine(
    writer,
    "Mapa táctico — zonas y puntos al cierre del informe",
  );
}

export async function exportOperationReportPdf(
  report: OperationReportSnapshot,
  interventionId: string,
  options?: { mapImageDataUrl?: string | null },
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const writer: PdfWriter = { doc, y: PAGE_MARGIN };

  writeLine(writer, "RAD TEDAX — Informe operativo", { bold: true });
  writeLine(writer, report.operation.name, { bold: true });
  writeLine(writer, `Estado: ${statusLabel(report.operation.status)}`);
  writeLine(
    writer,
    `Generado: ${new Date(report.generatedAt).toLocaleString("es-ES")}`,
  );

  writeSectionTitle(writer, "Operación");
  writeLine(
    writer,
    `Fecha: ${new Date(report.operation.occurredAt).toLocaleString("es-ES")}`,
  );
  writeLine(
    writer,
    `Duración: ${
      report.operation.durationSeconds !== null
        ? formatDurationHms(report.operation.durationSeconds)
        : "—"
    }`,
  );

  writeSectionTitle(writer, "Anotaciones");
  if (report.annotations.length === 0) {
    writeLine(writer, "Operación documentada sin incidencias registradas.");
  } else {
    for (const annotation of report.annotations) {
      const time = formatAnnotationTime(annotation.createdAt);
      writeLine(
        writer,
        time ? `${time} ${annotation.text}` : annotation.text,
      );
    }
  }

  writeSectionTitle(writer, "Ubicación");
  if (report.location) {
    if (report.location.label) {
      writeLine(writer, report.location.label);
    }
    if (report.location.coordinates) {
      writeLine(
        writer,
        `Coordenadas: ${report.location.coordinates[1].toFixed(6)}, ${report.location.coordinates[0].toFixed(6)}`,
      );
    }
    if (report.tacticalPoints.length > 0) {
      for (const point of report.tacticalPoints) {
        writeLine(
          writer,
          `${point.label}: ${point.coordinates[1].toFixed(6)}, ${point.coordinates[0].toFixed(6)}`,
        );
      }
    }
  } else {
    writeLine(writer, "Sin ubicación registrada.");
  }

  if (options?.mapImageDataUrl) {
    writeMapImage(writer, options.mapImageDataUrl);
  }

  writeSectionTitle(writer, "Cinturones establecidos");
  const belts = beltCopy(
    report.zoneParams.zoningPhase ?? "measured",
    report.zoneParams.zoneIEstimated ?? false,
  );
  const innerDetails = [
    report.zoneParams.zoningPhase === "initial-cordon"
      ? null
      : formatZoneILimit(report.zoneParams.limitZoneI),
    belts.innerNote,
  ].filter(Boolean);
  const outerDetails = [
    report.zoneParams.zoningPhase === "initial-cordon"
      ? null
      : formatZoneIILimit(report.zoneParams.limitZoneII),
    belts.outerNote,
  ].filter(Boolean);
  writeLine(
    writer,
    `${belts.innerTitle}: ${report.zoneParams.radiusZoneIMeters} m (${innerDetails.join("; ")})`,
  );
  writeLine(
    writer,
    `${belts.outerTitle}: ${report.zoneParams.radiusZoneIIMeters} m (${outerDetails.join("; ")})`,
  );

  writeSectionTitle(writer, "Mediciones clave");
  writeLine(
    writer,
    `Dosis máx. permitida: ${formatAccumulatedDose(
      report.dosimetry.maxOperationDose.value,
      report.dosimetry.maxOperationDose.unit,
    )}`,
  );
  writeLine(
    writer,
    `Tasa máx. de referencia: ${formatMaxDoseRate(report.dosimetry.maxZoneDoseRateMsvPerHour)}`,
  );
  writeLine(
    writer,
    `Dosis acumulada del equipo: ${formatAccumulatedDoseMsv(report.dosimetry.teamAccumulatedMsv)} (${formatDoseValue(report.dosimetry.teamPercentOfLimit)}% del límite)`,
  );

  writeSectionTitle(writer, "Intervinientes");
  if (report.participants.length === 0) {
    writeLine(writer, "No hay intervinientes asignados.");
  } else {
    for (const participant of report.participants) {
      writeLine(
        writer,
        `${participant.name} · ${participant.teamLabel} · ${participant.riskLevel}`,
      );
      writeLine(
        writer,
        `${formatAccumulatedDoseMsv(participant.accumulatedDoseMsv)} · ${formatDurationHms(participant.timeInZoneSeconds)} en zona · ${formatDoseValue(participant.percentOfLimit)}% del límite`,
      );
    }
  }

  writeSectionTitle(writer, "Cronología");
  if (report.timeline.length === 0) {
    writeLine(writer, "Aún no hay registros en esta operación.");
  } else {
    for (const event of report.timeline) {
      writeLine(
        writer,
        `${formatTimeLabel(event.at)} · ${event.participantName} · ${describeTimelineEvent(event)}`,
      );
    }
  }

  writeSectionTitle(writer, "Incidencias");
  writeLine(writer, "Sin incidencias registradas.");

  const datePart = new Date(report.generatedAt)
    .toISOString()
    .slice(0, 10);
  const filename = `informe-${slugify(report.operation.name) || interventionId}-${datePart}.pdf`;
  doc.save(filename);
}
