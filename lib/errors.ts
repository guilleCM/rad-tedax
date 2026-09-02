import { randomBytes } from "crypto";
import type { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

export type ClassifiedError = {
  code: string;
  message: string;
  status: number;
  ref?: string;
};

function generateRef(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

function logWithRef(ref: string, error: unknown) {
  console.error(`[${ref}]`, error);
}

export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      code: "BAD_REQUEST",
      message: "La petición no es válida.",
      status: 400,
    };
  }

  if (error instanceof Error) {
    if (
      error.name === "MongoServerSelectionError" ||
      error.name === "MongoNetworkError" ||
      error.message.includes("MONGODB_URI is not configured")
    ) {
      const ref = generateRef();
      logWithRef(ref, error);
      return {
        code: "DB_UNAVAILABLE",
        message:
          "No se pudo conectar con la base de datos. Inténtalo de nuevo en unos segundos.",
        status: 503,
        ref,
      };
    }

    if (error.name === "MongoTimeoutError") {
      const ref = generateRef();
      logWithRef(ref, error);
      return {
        code: "DB_TIMEOUT",
        message:
          "La base de datos tardó demasiado en responder. Inténtalo de nuevo.",
        status: 504,
        ref,
      };
    }

    const ref = generateRef();
    logWithRef(ref, error);
    return {
      code: "INTERNAL",
      message: "Ha ocurrido un error inesperado. Inténtalo de nuevo.",
      status: 500,
      ref,
    };
  }

  const ref = generateRef();
  logWithRef(ref, error);
  return {
    code: "INTERNAL",
    message: "Ha ocurrido un error inesperado. Inténtalo de nuevo.",
    status: 500,
    ref,
  };
}

const FIELD_MESSAGES: Record<string, Partial<Record<string, string>>> = {
  name: {
    too_small: "El nombre es obligatorio.",
    too_big: "El nombre es demasiado largo.",
  },
  occurredAt: {
    invalid_type: "La fecha no es válida.",
    invalid_value: "La fecha no es válida.",
  },
};

export function formatZodError(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return "Revisa los datos del formulario.";

  const field = String(first.path[0] ?? "");
  const byField = FIELD_MESSAGES[field];
  const byCode = byField?.[first.code];
  if (byCode) return byCode;

  if (field === "occurredAt") return "La fecha no es válida.";
  if (field === "name") return "El nombre es obligatorio.";

  return "Revisa los datos del formulario.";
}
