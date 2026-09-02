import { auth } from "@/lib/auth";
import { jsonData, jsonError, jsonValidationError, unauthorized } from "@/lib/api";
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
      return jsonValidationError("Id inválido");
    }
    if (!objectIdSchema.safeParse(userId).success) {
      return jsonValidationError("userId inválido");
    }

    const body = await request.json();
    const parsed = sessionActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(
        "Datos inválidos",
        parsed.error.flatten(),
      );
    }

    if (parsed.data.action !== "start") {
      return jsonValidationError("Acción no válida");
    }

    const data = await startParticipantSession(
      id,
      session.user.id,
      session.user.role,
      userId,
      parsed.data.zone,
    );
    return jsonData(data);
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
      return jsonValidationError("Id inválido");
    }
    if (!objectIdSchema.safeParse(userId).success) {
      return jsonValidationError("userId inválido");
    }

    const body = await request.json();
    const parsed = sessionActionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(
        "Datos inválidos",
        parsed.error.flatten(),
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

    return jsonData(data);
  } catch (error) {
    return jsonError(error);
  }
}
