import { jsonOk } from "@/lib/api";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[test-db]", error);
    return jsonOk(
      { ok: false, error: error instanceof Error ? error.name : "Unknown" },
      503,
    );
  }
}
