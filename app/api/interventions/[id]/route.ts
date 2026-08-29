import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/api";
import {
  objectIdSchema,
  updateInterventionSchema,
} from "@/lib/validations/intervention";
import {
  getIntervention,
  removeIntervention,
  updateIntervention,
} from "@/lib/services/interventions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    const { id } = await context.params;
    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }

    const data = await getIntervention(id, session.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    const { id } = await context.params;
    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = updateInterventionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION",
            message: "Datos inválidos",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const data = await updateIntervention(id, session.user.id, {
      name: parsed.data.name,
      occurredAt: parsed.data.occurredAt,
      status: parsed.data.status,
      coordinates: parsed.data.coordinates,
      locationLabel: parsed.data.locationLabel,
      zoneParams: parsed.data.zoneParams,
      manualOverrides: parsed.data.manualOverrides,
      recalculate: parsed.data.recalculate,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    const { id } = await context.params;
    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }

    const data = await removeIntervention(id, session.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
