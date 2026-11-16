import type { UserRole, UserStatus } from '../../../domain/constants/user';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

/** Lo que la GUI necesita de la sesión. A propósito no incluye el token. */
export interface SessionResponse {
  userId: string;
  role: UserRole;
  expiresAt: number;
}
