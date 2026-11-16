import { createApp } from 'vue';
import { useCases } from './bootstrap/container';
import App from './entrypoint/gui/App.vue';
import { USE_CASES } from './entrypoint/gui/context';
import { createAppRouter } from './entrypoint/gui/router';
import './entrypoint/gui/styles.css';

const router = createAppRouter(useCases);

// Lo dispara el callback del HttpClient cuando una petición protegida recibe 401.
window.addEventListener('session-expired', () => {
  void router.replace({ path: '/login', query: { expired: '1' } });
});

// Otra pestaña cambió el almacenamiento: si ya no hay sesión, volvemos a login.
window.addEventListener('storage', () => {
  if (!useCases.currentSession() && !router.currentRoute.value.meta.public) {
    void router.replace('/login');
  }
});

createApp(App)
  .provide(USE_CASES, useCases)
  .use(router)
  .mount('#app');
