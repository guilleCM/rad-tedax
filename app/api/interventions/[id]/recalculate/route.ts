import { auth } from "@/lib/auth";
import { jsonData, jsonError, jsonValidationError, unauthorized } from "@/lib/api";
import { objectIdSchema } from "@/lib/validations/intervention";
import { recalculateIntervention } from "@/lib/services/interventions";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    const { id } = await context.params;
    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      return jsonValidationError("Id inválido");
    }

    const data = await recalculateIntervention(
      id,
      session.user.id,
      session.user.role,
    );
    return jsonData(data);
  } catch (error) {
    return jsonError(error);
  }
}
