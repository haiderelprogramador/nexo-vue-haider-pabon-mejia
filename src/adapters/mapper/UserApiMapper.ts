import { User } from '../../domain/model/User';
import type { CreateUserRequest, UpdateUserRequest } from '../dto/requests/user-requests';
import type { ApiUserResponse } from '../dto/responses/user-responses';

export const fromApiUser = (dto: ApiUserResponse): User =>
  new User(dto.id, dto.name, dto.email, dto.role, dto.status);

export const toCreateRequest = (user: User, password: string): CreateUserRequest => ({
  id: user.id.value,
  name: user.name.value,
  email: user.email.value,
  password,
  role: user.role,
});

export const toUpdateRequest = (user: User, password?: string): UpdateUserRequest => ({
  name: user.name.value,
  email: user.email.value,
  role: user.role,
  status: user.status,
  // Solo se agrega la propiedad si hay contraseña nueva.
  ...(password ? { password } : {}),
});
