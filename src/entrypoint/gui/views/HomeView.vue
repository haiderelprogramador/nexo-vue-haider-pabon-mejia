<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, LifeBuoy, ShieldCheck, Sparkles, UserPen, UserPlus, Users,
} from 'lucide-vue-next';
import type { UserResponse } from '../../../application/dto/responses/user-responses';
import { errorMessage, roleLabel, statusLabel, useApplication } from '../context';

const app = useApplication();
const session = app.currentSession();

const users = ref<UserResponse[]>([]);
const busy = ref(true);
const error = ref('');

// Misma regla de consulta que el backend. Es ayuda visual, no seguridad.
const canRead = session?.role === 'ADMIN' || session?.role === 'REVIEWER';

onMounted(async () => {
  try {
    if (canRead) users.value = await app.list();
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    busy.value = false;
  }
});

function initials(name: string): string {
  return name.split(' ').map((part) => part.charAt(0)).slice(0, 2).join('').toUpperCase();
}
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">Panel</span>
      <h1>Te damos la bienvenida<span class="heading-dot">.</span></h1>
      <p class="muted">Desde aquí puedes crear, consultar y mantener al día a tu equipo.</p>
    </div>
    <RouterLink to="/usuarios/crear" class="button primary">
      <UserPlus :size="18" aria-hidden="true" /> Crear usuario
    </RouterLink>
  </div>

  <section class="welcome-banner">
    <div>
      <span class="pill light-pill">Espacio de trabajo</span>
      <h2>Todo tu equipo,<br class="desktop-break" /> ordenado y a la mano</h2>
      <p>Revisa quién está activo, quién espera activación y qué rol tiene cada persona.</p>
      <RouterLink to="/usuarios" class="banner-link">
        Ver el directorio <ArrowRight :size="17" aria-hidden="true" />
      </RouterLink>
    </div>
    <div class="team-art" aria-hidden="true">
      <span class="orbit orbit-one"></span>
      <span class="orbit orbit-two"></span>
      <div class="art-card">
        <div class="art-avatars"><span>AL</span><span>MR</span><span>JC</span></div>
        <small>Equipo</small>
      </div>
      <span class="floating-icon"><Users :size="18" /></span>
      <span class="art-spark"><Sparkles :size="16" /></span>
    </div>
  </section>

  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <section class="stats-grid">
    <article class="stat">
      <span class="stat-icon mint"><Users :size="20" aria-hidden="true" /></span>
      <div>
        <span class="stat-label">Usuarios totales</span>
        <strong>{{ busy ? '…' : canRead && !error ? users.length : '—' }}</strong>
      </div>
    </article>
    <article class="stat">
      <span class="stat-icon sand"><BadgeCheck :size="20" aria-hidden="true" /></span>
      <div>
        <span class="stat-label">Usuarios activos</span>
        <strong>{{ busy ? '…' : canRead && !error ? users.filter((user) => user.status === 'ACTIVE').length : '—' }}</strong>
      </div>
    </article>
    <article class="stat role-stat">
      <span class="stat-icon"><ShieldCheck :size="20" aria-hidden="true" /></span>
      <div>
        <span class="stat-label">Tu rol</span>
        <strong>{{ session ? roleLabel[session.role] : '—' }}</strong>
      </div>
    </article>
  </section>

  <section class="section">
    <div class="section-heading">
      <h2>Accesos directos</h2>
      <span class="section-meta">Tareas frecuentes</span>
    </div>
    <div class="actions-grid">
      <RouterLink to="/usuarios/crear" class="action-card">
        <span class="action-icon mint"><UserPlus :size="20" aria-hidden="true" /></span>
        <h3>Crear usuario</h3>
        <p>Añade a una persona nueva y asígnale un rol.</p>
        <span class="action-link">Empezar</span>
        <ArrowUpRight class="corner-arrow" :size="18" aria-hidden="true" />
      </RouterLink>
      <RouterLink to="/usuarios" class="action-card">
        <span class="action-icon cream"><Users :size="20" aria-hidden="true" /></span>
        <h3>Listar usuarios</h3>
        <p>Busca por nombre o correo y filtra por estado.</p>
        <span class="action-link">Abrir directorio</span>
        <ArrowUpRight class="corner-arrow" :size="18" aria-hidden="true" />
      </RouterLink>
      <RouterLink to="/usuarios/editar" class="action-card">
        <span class="action-icon lilac"><UserPen :size="20" aria-hidden="true" /></span>
        <h3>Editar usuario</h3>
        <p>Actualiza datos, rol o estado de una cuenta.</p>
        <span class="action-link">Elegir persona</span>
        <ArrowUpRight class="corner-arrow" :size="18" aria-hidden="true" />
      </RouterLink>
    </div>
  </section>

  <section class="panel">
    <div class="panel-heading">
      <h2>Vista rápida</h2>
      <RouterLink to="/usuarios" class="text-link">Ver todos</RouterLink>
    </div>

    <p v-if="busy" class="empty">Cargando usuarios…</p>
    <p v-else-if="!canRead" class="empty">Tu rol no permite consultar el directorio.</p>
    <p v-else-if="!users.length" class="empty">Todavía no hay usuarios para mostrar.</p>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th><span class="sr-only">Detalles</span></th></tr>
        </thead>
        <tbody>
          <tr v-for="user in users.slice(0, 4)" :key="user.id">
            <td>
              <div class="user-cell">
                <span class="avatar" aria-hidden="true">{{ initials(user.name) }}</span>
                <div><strong>{{ user.name }}</strong><small>{{ user.email }}</small></div>
              </div>
            </td>
            <td>{{ roleLabel[user.role] }}</td>
            <td>
              <span class="badge" :class="user.status.toLowerCase()"><i></i>{{ statusLabel[user.status] }}</span>
            </td>
            <td class="row-actions">
              <RouterLink
                :to="`/usuarios/${encodeURIComponent(user.id)}/editar`"
                class="icon-button"
                :aria-label="`Ver detalles de ${user.name}`"
              >
                <ArrowRight :size="17" aria-hidden="true" />
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="help-strip">
    <span class="help-icon"><LifeBuoy :size="20" aria-hidden="true" /></span>
    <p>
      <strong>¿Una cuenta nueva no puede entrar?</strong>
      Las cuentas se crean como pendientes: un administrador debe cambiarlas a activas.
    </p>
  </section>
</template>
