import { ApiError, UnauthorizedError } from '../../domain/exceptions/errors';
import type { SessionStore } from '../../domain/ports/out/SessionStore';

const TIMEOUT_MS = 30_000;

const LOCAL_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos enviados: hay información que el servicio no acepta.',
  401: 'Credenciales incorrectas o cuenta pendiente de activación.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No encontramos el recurso solicitado.',
  409: 'Ya existe un usuario con ese identificador o correo.',
};

function messageFor(status: number, backendMessage: unknown): string {
  if (LOCAL_MESSAGES[status]) return LOCAL_MESSAGES[status];
  if (status >= 500) return 'El servicio no está disponible en este momento. Intenta más tarde.';
  if (typeof backendMessage === 'string' && backendMessage) return backendMessage;
  return 'No se pudo completar la operación.';
}

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly sessions: SessionStore,
    private readonly onUnauthorized: () => void,
  ) {}

  async request<T>(
    path: string,
    method: string = 'GET',
    body?: unknown,
    authenticated: boolean = true,
  ): Promise<T> {
    // Solo las llamadas protegidas leen la sesión y llevan el token.
    const token = authenticated ? this.sessions.get()?.token : undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 401 && authenticated) {
        // Un 401 "tardío" de una sesión vieja no debe borrar una sesión nueva:
        // solo limpiamos si el token guardado sigue siendo el que enviamos.
        if (this.sessions.get()?.token === token) {
          this.sessions.clear();
          this.onUnauthorized();
        }
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        const error = await response.json().catch(() => null) as { message?: unknown } | null;
        throw new ApiError(messageFor(response.status, error?.message), response.status);
      }

      if (response.status === 204) return undefined as T;
      return await response.json() as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('El servicio tardó demasiado en responder. Intenta de nuevo.');
      }
      throw new ApiError('No se pudo conectar con el servicio. Revisa tu conexión o la configuración de la API.');
    } finally {
      clearTimeout(timer);
    }
  }
}
