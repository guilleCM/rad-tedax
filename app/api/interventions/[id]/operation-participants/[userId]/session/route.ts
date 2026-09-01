import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/api";
import {
  objectIdSchema,
  sessionActionSchema,
} from "@/lib/validations/intervention";
import {
  changeParticipantZone,
  startParticipantSession,
  stopParticipantSession,
} from "@/lib/services/operationParticipants";

type RouteContext = { params: Promise<{ id: string; userId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const { id, userId } = await context.params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }
    if (!objectIdSchema.safeParse(userId).success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "userId inválido" } },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = sessionActionSchema.safeParse(body);
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

    if (parsed.data.action !== "start") {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Acción no válida" } },
        { status: 400 },
      );
    }

    const data = await startParticipantSession(
      id,
      session.user.id,
      session.user.role,
      userId,
      parsed.data.zone,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const { id, userId } = await context.params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }
    if (!objectIdSchema.safeParse(userId).success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "userId inválido" } },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = sessionActionSchema.safeParse(body);
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

    const data =
      parsed.data.action === "changeZone"
        ? await changeParticipantZone(
            id,
            session.user.id,
            session.user.role,
            userId,
            parsed.data.zone,
          )
        : await stopParticipantSession(
            id,
            session.user.id,
            session.user.role,
            userId,
          );

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
