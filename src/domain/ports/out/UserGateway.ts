import type { Session } from '../../model/Session';
import type { User } from '../../model/User';

/** Lo que la aplicación necesita pedir al exterior, sin mencionar HTTP. */
export interface UserGateway {
  login(email: string, password: string): Promise<Session>;
  list(): Promise<User[]>;
  get(id: string): Promise<User>;
  create(user: User, password: string): Promise<User>;
  update(user: User, password?: string): Promise<User>;
  delete(id: string): Promise<void>;
}
