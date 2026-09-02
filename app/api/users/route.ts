import { auth } from "@/lib/auth";
import { jsonData, jsonError, jsonValidationError, unauthorized } from "@/lib/api";
import { createUserSchema } from "@/lib/validations/user";
import { createUser, listUsers } from "@/lib/services/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const data = await listUsers(session.user.role, session.user.id);
    return jsonData(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(
        "Datos inválidos",
        parsed.error.flatten(),
      );
    }

    const data = await createUser(
      session.user.role,
      session.user.id,
      parsed.data,
    );
    return jsonData(data, 201);
  } catch (error) {
    return jsonError(error);
  }
}
