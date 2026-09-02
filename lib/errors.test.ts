import { describe, expect, it } from "vitest";
import { AppError, classifyError, formatZodError } from "@/lib/errors";
import { createInterventionSchema } from "@/lib/validations/intervention";

describe("classifyError", () => {
  it("returns AppError as-is", () => {
    const error = new AppError("FORBIDDEN", "No puedes crear intervenciones", 403);
    expect(classifyError(error)).toEqual({
      code: "FORBIDDEN",
      message: "No puedes crear intervenciones",
      status: 403,
    });
  });

  it("maps SyntaxError to BAD_REQUEST", () => {
    const error = new SyntaxError("Unexpected token");
    expect(classifyError(error)).toEqual({
      code: "BAD_REQUEST",
      message: "La petición no es válida.",
      status: 400,
    });
  });

  it("maps MongoServerSelectionError to DB_UNAVAILABLE", () => {
    const error = new Error("connection refused");
    error.name = "MongoServerSelectionError";
    const result = classifyError(error);
    expect(result.code).toBe("DB_UNAVAILABLE");
    expect(result.status).toBe(503);
    expect(result.ref).toMatch(/^[A-F0-9]{8}$/);
  });

  it("maps MongoNetworkError to DB_UNAVAILABLE", () => {
    const error = new Error("network error");
    error.name = "MongoNetworkError";
    const result = classifyError(error);
    expect(result.code).toBe("DB_UNAVAILABLE");
    expect(result.status).toBe(503);
  });

  it("maps MongoTimeoutError to DB_TIMEOUT", () => {
    const error = new Error("timed out");
    error.name = "MongoTimeoutError";
    const result = classifyError(error);
    expect(result.code).toBe("DB_TIMEOUT");
    expect(result.status).toBe(504);
    expect(result.ref).toMatch(/^[A-F0-9]{8}$/);
  });

  it("maps missing MONGODB_URI to DB_UNAVAILABLE", () => {
    const error = new Error("MONGODB_URI is not configured");
    const result = classifyError(error);
    expect(result.code).toBe("DB_UNAVAILABLE");
    expect(result.status).toBe(503);
  });

  it("maps unknown errors to INTERNAL with ref", () => {
    const error = new Error("something broke");
    const result = classifyError(error);
    expect(result.code).toBe("INTERNAL");
    expect(result.status).toBe(500);
    expect(result.message).toBe(
      "Ha ocurrido un error inesperado. Inténtalo de nuevo.",
    );
    expect(result.ref).toMatch(/^[A-F0-9]{8}$/);
  });

  it("maps non-Error values to INTERNAL with ref", () => {
    const result = classifyError("unexpected");
    expect(result.code).toBe("INTERNAL");
    expect(result.ref).toMatch(/^[A-F0-9]{8}$/);
  });
});

describe("formatZodError", () => {
  it("returns name message for empty name", () => {
    const parsed = createInterventionSchema.safeParse({ name: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(formatZodError(parsed.error)).toBe("El nombre es obligatorio.");
    }
  });

  it("returns date message for invalid occurredAt", () => {
    const parsed = createInterventionSchema.safeParse({
      name: "OP_RAD_1",
      occurredAt: "not-a-date",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(formatZodError(parsed.error)).toBe("La fecha no es válida.");
    }
  });

  it("returns generic message for other validation issues", () => {
    const parsed = createInterventionSchema.safeParse({
      name: "OP_RAD_1",
      coordinates: [200, 100],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(formatZodError(parsed.error)).toBe("Revisa los datos del formulario.");
    }
  });
});
