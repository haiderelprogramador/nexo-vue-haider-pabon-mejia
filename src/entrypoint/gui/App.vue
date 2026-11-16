<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { Home, LogOut, ShieldCheck, Trash2, UserPen, UserPlus, Users } from 'lucide-vue-next';
import { roleLabel, useApplication } from './context';

const route = useRoute();
const router = useRouter();
const app = useApplication();

// localStorage no es reactivo: leer la ruta hace que este cálculo se repita
// en cada navegación y vuelva a consultar la sesión.
const session = computed(() => {
  void route.fullPath;
  return app.currentSession();
});

const nav = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/usuarios/crear', label: 'Crear usuario', icon: UserPlus },
  { to: '/usuarios', label: 'Listar usuarios', icon: Users },
  { to: '/usuarios/editar', label: 'Editar usuario', icon: UserPen },
  { to: '/usuarios/eliminar', label: 'Eliminar usuario', icon: Trash2 },
];

function logout() {
  app.logout();
  void router.replace('/login');
}
</script>

<template>
  <div v-if="!route.meta.public" class="workspace">
    <aside class="sidebar">
      <RouterLink to="/" class="brand"><span class="brand-dot"></span>Nexo</RouterLink>

      <div class="workspace-label">
        <span class="workspace-avatar" aria-hidden="true">EQ</span>
        <div>
          <small>Espacio</small>
          <span class="workspace-name">Equipo principal</span>
        </div>
      </div>

      <span class="nav-label">Usuarios</span>
      <nav aria-label="Navegación principal">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="{ selected: route.path === item.to }"
        >
          <component :is="item.icon" :size="19" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <i class="nav-indicator" aria-hidden="true"></i>
        </RouterLink>
      </nav>

      <div class="sidebar-bottom">
        <p class="security-note">
          <ShieldCheck :size="16" aria-hidden="true" />
          Acceso protegido por rol
        </p>
        <button type="button" class="logout" @click="logout">
          <LogOut :size="18" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div class="breadcrumb">Nexo <span>/</span> <strong>Usuarios</strong></div>
        <div class="profile">
          <span class="online-dot" aria-hidden="true"></span>
          <span class="profile-avatar" aria-hidden="true">{{ (session?.role ?? 'N').slice(0, 1) }}</span>
          <div>
            <span class="profile-name">Sesión activa</span>
            <small>{{ session ? roleLabel[session.role] : 'Sin sesión' }}</small>
          </div>
        </div>
      </header>

      <main>
        <RouterView :key="route.fullPath" />
      </main>

      <footer>Nexo · Panel de usuarios</footer>
    </div>
  </div>

  <RouterView v-else :key="route.fullPath" />
</template>
