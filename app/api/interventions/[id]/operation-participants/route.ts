import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/api";
import {
  addOperationParticipantSchema,
  objectIdSchema,
} from "@/lib/validations/intervention";
import {
  addOperationParticipant,
  removeOperationParticipant,
} from "@/lib/services/operationParticipants";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const { id } = await context.params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = addOperationParticipantSchema.safeParse(body);
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

    const data = await addOperationParticipant(
      id,
      session.user.id,
      session.user.role,
      parsed.data,
    );
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const { id } = await context.params;
    if (!objectIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const userIdResult = objectIdSchema.safeParse(userId);
    if (!userIdResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "userId inválido" } },
        { status: 400 },
      );
    }

    const data = await removeOperationParticipant(
      id,
      session.user.id,
      session.user.role,
      userIdResult.data,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
