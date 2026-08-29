import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/api";
import { createInterventionSchema } from "@/lib/validations/intervention";
import {
  createIntervention,
  listInterventions,
} from "@/lib/services/interventions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    const data = await listInterventions(session.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createInterventionSchema.safeParse(body);
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

    const data = await createIntervention(session.user.id, {
      name: parsed.data.name,
      occurredAt: parsed.data.occurredAt,
      status: parsed.data.status,
      coordinates: parsed.data.coordinates,
      locationLabel: parsed.data.locationLabel,
      zoneParams: parsed.data.zoneParams,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
