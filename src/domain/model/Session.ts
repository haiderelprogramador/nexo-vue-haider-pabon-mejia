import type { UserRole } from '../constants/user';

export interface Session {
  /** Credencial que enviará el adaptador HTTP. */
  token: string;
  /** Vencimiento en milisegundos desde el inicio del tiempo Unix. */
  expiresAt: number;
  /** Identificador obtenido del claim `sub`. */
  userId: string;
  /** Rol que la GUI usa para presentar sus opciones. */
  role: UserRole;
}
