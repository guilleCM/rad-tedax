import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[test-db]", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
