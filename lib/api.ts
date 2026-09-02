import { NextResponse } from "next/server";
import { classifyError } from "@/lib/errors";

export function jsonError(error: unknown) {
  const classified = classifyError(error);
  const body: { code: string; message: string; ref?: string } = {
    code: classified.code,
    message: classified.message,
  };
  if (classified.ref) body.ref = classified.ref;
  return NextResponse.json({ error: body }, { status: classified.status });
}

export function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Autenticación requerida" } },
    { status: 401 },
  );
}
