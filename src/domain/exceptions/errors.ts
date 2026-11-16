/** Un dato rompió una regla del dominio (por ejemplo, un nombre muy corto). */
export class DomainError extends Error {}

/**
 * Fallo al hablar con la API. `status` es el estado HTTP; usamos 0 cuando no
 * hubo estado (conexión caída, tiempo agotado). Cero es una convención local.
 */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number = 0) {
    super(message);
  }
}

/** La API respondió 401 a una petición protegida: la sesión ya no sirve. */
export class UnauthorizedError extends ApiError {
  constructor() {
    super('Tu sesión venció. Inicia sesión de nuevo.', 401);
  }
}
