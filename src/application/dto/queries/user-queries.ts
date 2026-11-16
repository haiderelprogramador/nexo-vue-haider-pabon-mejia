export interface GetUserQuery {
  id: string;
}

export interface ListUsersQuery {
  /** Búsqueda local opcional por nombre, correo o identificador. */
  search?: string;
}
