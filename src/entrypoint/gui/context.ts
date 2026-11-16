import { inject, type InjectionKey } from 'vue';
import type { UseCases } from '../../application/ports/in/use-cases';

/** Llave de inyección: hay que importar ESTA, no crear otro Symbol igual. */
export const USE_CASES: InjectionKey<UseCases> = Symbol('use-cases');

/** Se llama desde el setup de un componente. */
export function useApplication(): UseCases {
  const app = inject(USE_CASES);
  if (!app) throw new Error('Falta configurar los casos de uso: revisa provide(USE_CASES, ...) en main.ts.');
  return app;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export const roleLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
  REVIEWER: 'Revisor',
};

export const statusLabel: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PENDING: 'Pendiente',
  BLOCKED: 'Bloqueado',
};
