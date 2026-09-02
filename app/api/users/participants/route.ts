import { auth } from "@/lib/auth";
import { jsonData, jsonError, jsonValidationError, unauthorized } from "@/lib/api";
import { createParticipantRegistrySchema } from "@/lib/validations/user";
import { createParticipantRegistry } from "@/lib/services/users";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createParticipantRegistrySchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(
        "Datos inválidos",
        parsed.error.flatten(),
      );
    }

    const data = await createParticipantRegistry(
      session.user.role,
      session.user.id,
      parsed.data,
    );
    return jsonData(data, 201);
  } catch (error) {
    return jsonError(error);
  }
}
