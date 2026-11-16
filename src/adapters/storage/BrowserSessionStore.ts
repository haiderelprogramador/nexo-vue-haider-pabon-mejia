import { USER_ROLES } from '../../domain/constants/user';
import type { Session } from '../../domain/model/Session';
import type { SessionStore } from '../../domain/ports/out/SessionStore';

export const SESSION_KEY = 'nexo.session';

export class BrowserSessionStore implements SessionStore {
  constructor(private readonly storage: Storage) {}

  get(): Session | null {
    try {
      const raw = this.storage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as Session;
      // `as Session` no valida nada: la condición de abajo es la que comprueba.
      const valid = !!session
        && typeof session.token === 'string' && session.token.length > 0
        && Number.isFinite(session.expiresAt)
        && typeof session.userId === 'string'
        && USER_ROLES.includes(session.role);
      if (!valid) {
        this.clear();
        return null;
      }
      return session;
    } catch {
      this.clear();
      return null;
    }
  }

  save(session: Session): void {
    this.storage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  clear(): void {
    this.storage.removeItem(SESSION_KEY);
  }
}
