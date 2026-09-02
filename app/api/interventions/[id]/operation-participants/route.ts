import { auth } from "@/lib/auth";
import { jsonData, jsonError, jsonValidationError, unauthorized } from "@/lib/api";
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
      return jsonValidationError("Id inválido");
    }

    const body = await request.json();
    const parsed = addOperationParticipantSchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(
        "Datos inválidos",
        parsed.error.flatten(),
      );
    }

    const data = await addOperationParticipant(
      id,
      session.user.id,
      session.user.role,
      parsed.data,
    );
    return jsonData(data, 201);
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
      return jsonValidationError("Id inválido");
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const userIdResult = objectIdSchema.safeParse(userId);
    if (!userIdResult.success) {
      return jsonValidationError("userId inválido");
    }

    const data = await removeOperationParticipant(
      id,
      session.user.id,
      session.user.role,
      userIdResult.data,
    );
    return jsonData(data);
  } catch (error) {
    return jsonError(error);
  }
}
