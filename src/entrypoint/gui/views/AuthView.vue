<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Users } from 'lucide-vue-next';
import { errorMessage, useApplication } from '../context';

const route = useRoute();
const router = useRouter();
const app = useApplication();

const email = ref('');
const password = ref('');
const show = ref(false);
const busy = ref(false);
const error = ref('');

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    await app.login({ email: email.value, password: password.value });
    // Solo aceptamos un destino interno: empieza por "/" pero no por "//".
    const wanted = route.query.redirect;
    const redirect = typeof wanted === 'string' && wanted.startsWith('/') && !wanted.startsWith('//')
      ? wanted
      : '/';
    await router.replace(redirect);
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth-layout">
    <section class="auth-story">
      <RouterLink to="/login" class="brand"><span class="brand-dot"></span>Nexo</RouterLink>

      <div class="story-content">
        <span class="eyebrow">Gestión de usuarios</span>
        <h1>Tu equipo, en un solo lugar<span class="heading-dot">.</span></h1>
        <p>Crea, consulta y organiza a las personas de tu espacio de trabajo con roles claros.</p>
        <div class="story-circles" aria-hidden="true">
          <span>AL</span><span>MR</span><span>JC</span><span><Users :size="18" /></span>
        </div>
      </div>

      <p class="story-footer">
        <ShieldCheck :size="16" aria-hidden="true" />
        Información segura y accesos por rol
      </p>
    </section>

    <section class="auth-form-area">
      <p class="auth-register">
        ¿Aún no tienes cuenta?
        <RouterLink to="/registro">Crear usuario</RouterLink>
      </p>

      <div class="auth-card">
        <span class="eyebrow">Bienvenido de nuevo</span>
        <h2>Inicia sesión</h2>
        <p class="muted">Usa el correo y la contraseña de tu cuenta activa.</p>

        <p v-if="route.query.expired" class="notice" role="alert">
          Tu sesión venció. Inicia sesión de nuevo para continuar.
        </p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <form @submit.prevent="submit">
          <label for="login-email">Correo electrónico</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            required
            autocomplete="username"
            placeholder="nombre@empresa.com"
          />

          <label for="login-password">Contraseña</label>
          <div class="password-field">
            <input
              id="login-password"
              v-model="password"
              :type="show ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="show = !show"
            >
              <EyeOff v-if="show" :size="18" aria-hidden="true" />
              <Eye v-else :size="18" aria-hidden="true" />
            </button>
          </div>

          <button class="button primary full" type="submit" :disabled="busy">
            {{ busy ? 'Iniciando sesión…' : 'Iniciar sesión' }}
            <ArrowRight :size="18" aria-hidden="true" />
          </button>
        </form>

        <p class="auth-security">
          <ShieldCheck :size="15" aria-hidden="true" />
          Tu información viaja protegida cuando el sitio se sirve con HTTPS.
        </p>
      </div>

      <p class="auth-copyright">© {{ new Date().getFullYear() }} Nexo</p>
    </section>
  </div>
</template>
