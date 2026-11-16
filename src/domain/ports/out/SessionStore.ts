import type { Session } from '../../model/Session';

/** Leer, guardar y quitar la sesión, sin mencionar el navegador. */
export interface SessionStore {
  get(): Session | null;
  save(session: Session): void;
  clear(): void;
}
