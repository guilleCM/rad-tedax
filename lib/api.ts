import { NextResponse } from "next/server";
import { AppError } from "@/lib/services/interventions";

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Error interno del servidor" } },
    { status: 500 },
  );
}

export function unauthorized() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Autenticación requerida" } },
    { status: 401 },
  );
}
