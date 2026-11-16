import type { Session } from '../../domain/model/Session';
import type { User } from '../../domain/model/User';
import type { SessionResponse, UserResponse } from '../dto/responses/user-responses';

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id.value,
  name: user.name.value,
  email: user.email.value,
  role: user.role,
  status: user.status,
});

export const toSessionResponse = (session: Session): SessionResponse => ({
  userId: session.userId,
  role: session.role,
  expiresAt: session.expiresAt,
});
