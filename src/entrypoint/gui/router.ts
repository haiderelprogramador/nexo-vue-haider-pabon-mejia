import { createRouter, createWebHistory, type Router } from 'vue-router';
import type { UseCases } from '../../application/ports/in/use-cases';
import AuthView from './views/AuthView.vue';
import HomeView from './views/HomeView.vue';
import UserFormView from './views/UserFormView.vue';
import UsersView from './views/UsersView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** No exige sesión. Lo interpreta nuestro guard, no Vue Router. */
    public?: boolean;
    /** El formulario se usa como registro público. */
    register?: boolean;
    /** Cambia títulos del directorio. */
    mode?: 'edit' | 'delete';
  }
}

export function createAppRouter(app: UseCases): Router {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', component: AuthView, meta: { public: true } },
      { path: '/registro', component: UserFormView, meta: { public: true, register: true } },
      { path: '/', component: HomeView },
      { path: '/usuarios', component: UsersView },
      { path: '/usuarios/crear', component: UserFormView },
      { path: '/usuarios/editar', component: UsersView, meta: { mode: 'edit' } },
      { path: '/usuarios/eliminar', component: UsersView, meta: { mode: 'delete' } },
      { path: '/usuarios/:id/editar', component: UserFormView },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  });

  router.beforeEach((to) => {
    if (!to.meta.public && !app.currentSession()) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
    return true;
  });

  return router;
}
