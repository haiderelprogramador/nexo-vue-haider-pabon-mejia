import { DomainError } from '../../domain/exceptions/errors';
import { User } from '../../domain/model/User';
import type { SessionStore } from '../../domain/ports/out/SessionStore';
import type { UserGateway } from '../../domain/ports/out/UserGateway';
import { UserEmail, UserId, UserPassword } from '../../domain/valueobjects/user-values';
import type {
  CreateUserCommand,
  DeleteUserCommand,
  LoginCommand,
  UpdateUserCommand,
} from '../dto/commands/user-commands';
import type { GetUserQuery, ListUsersQuery } from '../dto/queries/user-queries';
import type { SessionResponse, UserResponse } from '../dto/responses/user-responses';
import { toSessionResponse, toUserResponse } from '../mapper/UserMapper';
import type { UseCases } from '../ports/in/use-cases';

export class UserApplicationService implements UseCases {
  constructor(
    private readonly gateway: UserGateway,
    private readonly sessions: SessionStore,
  ) {}

  async login(command: LoginCommand): Promise<SessionResponse> {
    const email = new UserEmail(command.email);
    // Para entrar no exigimos 8 caracteres: solo que haya algo que enviar.
    if (!command.password.trim()) throw new DomainError('Escribe tu contraseña.');
    const session = await this.gateway.login(email.value, command.password);
    this.sessions.save(session);
    return toSessionResponse(session);
  }

  currentSession(): SessionResponse | null {
    const session = this.sessions.get();
    return session ? toSessionResponse(session) : null;
  }

  logout(): void {
    this.sessions.clear();
  }

  async create(command: CreateUserCommand): Promise<UserResponse> {
    const user = new User(command.id, command.name, command.email, command.role, 'PENDING');
    const password = new UserPassword(command.password);
    return toUserResponse(await this.gateway.create(user, password.value));
  }

  async list(query: ListUsersQuery = {}): Promise<UserResponse[]> {
    const users = (await this.gateway.list()).map(toUserResponse);
    const search = query.search?.trim().toLowerCase();
    if (!search) return users;
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.id}`.toLowerCase().includes(search));
  }

  async get(query: GetUserQuery): Promise<UserResponse> {
    const id = new UserId(query.id);
    return toUserResponse(await this.gateway.get(id.value));
  }

  async update(command: UpdateUserCommand): Promise<UserResponse> {
    const user = new User(command.id, command.name, command.email, command.role, command.status);
    // '' significa "conservar la actual". '   ' es texto: llega al objeto de
    // valor y se rechaza al recortarlo, en vez de ignorarse en silencio.
    const password = command.password ? new UserPassword(command.password).value : undefined;
    return toUserResponse(await this.gateway.update(user, password));
  }

  delete(command: DeleteUserCommand): Promise<void> {
    const id = new UserId(command.id);
    return this.gateway.delete(id.value);
  }
}
