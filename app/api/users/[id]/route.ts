import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/api";
import { objectIdSchema } from "@/lib/validations/intervention";
import { removeUser } from "@/lib/services/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return unauthorized();

  try {
    const { id } = await context.params;
    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Id inválido" } },
        { status: 400 },
      );
    }

    const data = await removeUser(session.user.role, session.user.id, id);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
