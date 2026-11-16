import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '../constants/user';
import { DomainError } from '../exceptions/errors';
import { UserEmail, UserId, UserName } from '../valueobjects/user-values';

export class User {
  readonly id: UserId;
  readonly name: UserName;
  readonly email: UserEmail;
  readonly role: UserRole;
  readonly status: UserStatus;

  constructor(id: string, name: string, email: string, role: UserRole, status: UserStatus) {
    this.id = new UserId(id);
    this.name = new UserName(name);
    this.email = new UserEmail(email);
    // El tipo no basta: el JSON real puede traer valores inesperados.
    if (!USER_ROLES.includes(role)) throw new DomainError('El rol no es válido.');
    if (!USER_STATUSES.includes(status)) throw new DomainError('El estado no es válido.');
    this.role = role;
    this.status = status;
  }
}
