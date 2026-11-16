import { USER_ROLES, type UserRole } from '../../domain/constants/user';
import { ApiError } from '../../domain/exceptions/errors';
import type { Session } from '../../domain/model/Session';
import type { User } from '../../domain/model/User';
import type { UserGateway } from '../../domain/ports/out/UserGateway';
import type { ApiUserResponse, LoginResponse } from '../dto/responses/user-responses';
import { fromApiUser, toCreateRequest, toUpdateRequest } from '../mapper/UserApiMapper';
import type { HttpClient } from './HttpClient';

export class UserHttpAdapter implements UserGateway {
  constructor(private readonly http: HttpClient) {}

  async login(email: string, password: string): Promise<Session> {
    // `false`: llamada pública, no lleva Bearer ni dispara "sesión vencida".
    const response = await this.http.request<LoginResponse>(
      '/auth/login', 'POST', { email, password }, false,
    );

    try {
      // Decodificar NO es verificar la firma: eso lo hace el servidor.
      const payload = response.accessToken.split('.')[1]!
        .replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(payload)) as { sub?: unknown; role?: unknown; exp?: unknown };

      const valid = typeof claims.sub === 'string'
        && USER_ROLES.includes(claims.role as UserRole)
        && typeof claims.exp === 'number'
        && claims.exp * 1000 > Date.now()
        && response.tokenType === 'Bearer';
      if (!valid) throw new Error('claims');

      return {
        token: response.accessToken,
        expiresAt: (claims.exp as number) * 1000,
        userId: claims.sub as string,
        role: claims.role as UserRole,
      };
    } catch {
      throw new ApiError('El servicio devolvió un token inválido.');
    }
  }

  async list(): Promise<User[]> {
    return (await this.http.request<ApiUserResponse[]>('/users')).map(fromApiUser);
  }

  async get(id: string): Promise<User> {
    return fromApiUser(
      await this.http.request<ApiUserResponse>(`/users/${encodeURIComponent(id)}`),
    );
  }

  async create(user: User, password: string): Promise<User> {
    return fromApiUser(
      await this.http.request<ApiUserResponse>('/users', 'POST', toCreateRequest(user, password), false),
    );
  }

  async update(user: User, password?: string): Promise<User> {
    return fromApiUser(
      await this.http.request<ApiUserResponse>(
        `/users/${encodeURIComponent(user.id.value)}`, 'PUT', toUpdateRequest(user, password),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>(`/users/${encodeURIComponent(id)}`, 'DELETE');
  }
}
