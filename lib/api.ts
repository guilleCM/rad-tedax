import { NextResponse } from "next/server";
import { classifyError } from "@/lib/errors";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status, headers: NO_STORE_HEADERS });
}

export function jsonOk(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export function jsonValidationError(
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION",
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}

export function jsonError(error: unknown) {
  const classified = classifyError(error);
  const body: { code: string; message: string; ref?: string } = {
    code: classified.code,
    message: classified.message,
  };
  if (classified.ref) body.ref = classified.ref;
  return NextResponse.json(
    { error: body },
    { status: classified.status, headers: NO_STORE_HEADERS },
  );
}

export function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Autenticación requerida" } },
    { status: 401, headers: NO_STORE_HEADERS },
  );
}
