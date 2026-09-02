export type ApiError = {
  code: string;
  message: string;
  ref?: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

type ApiErrorBody = {
  error?: ApiError;
};

const CLIENT_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
  NETWORK: "Sin conexión. Comprueba tu red e inténtalo de nuevo.",
  BAD_RESPONSE:
    "Respuesta inesperada del servidor. Inténtalo de nuevo.",
};

export function getErrorMessage(error: ApiError): string {
  const base =
    CLIENT_MESSAGES[error.code] ?? error.message ?? "Ha ocurrido un error.";

  if (error.ref && error.code === "INTERNAL") {
    return `${base} (ref: ${error.ref})`;
  }

  return base;
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);

    let json: ApiErrorBody & { data?: T };
    try {
      json = (await res.json()) as ApiErrorBody & { data?: T };
    } catch {
      return {
        ok: false,
        error: {
          code: "BAD_RESPONSE",
          message: CLIENT_MESSAGES.BAD_RESPONSE,
        },
      };
    }

    if (!res.ok) {
      const serverError = json.error ?? {
        code: "INTERNAL",
        message: "Ha ocurrido un error inesperado. Inténtalo de nuevo.",
      };
      return {
        ok: false,
        error: {
          code: serverError.code,
          message: getErrorMessage(serverError),
          ref: serverError.ref,
        },
      };
    }

    return { ok: true, data: json.data as T };
  } catch {
    return {
      ok: false,
      error: {
        code: "NETWORK",
        message: CLIENT_MESSAGES.NETWORK,
      },
    };
  }
}
