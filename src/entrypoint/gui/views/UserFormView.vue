<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ArrowLeft, CircleCheck, Info } from 'lucide-vue-next';
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '../../../domain/constants/user';
import { errorMessage, roleLabel, statusLabel, useApplication } from '../context';

const route = useRoute();
const app = useApplication();

const register = !!route.meta.register;
const editing = typeof route.params.id === 'string';
// El UUID nace con el formulario, no en cada envío: si un intento queda en
// duda por la conexión, el reintento reutiliza el mismo identificador.
const id = editing ? (route.params.id as string) : crypto.randomUUID();

const name = ref('');
const email = ref('');
const password = ref('');
const role = ref<UserRole>('MEMBER');
const status = ref<UserStatus>('PENDING');

const busy = ref(false);
const loading = ref(editing);
const error = ref('');
const success = ref(false);
const loaded = ref(!editing);

// Ayuda visual: el backend sigue siendo quien rechaza un PUT sin permiso.
const canEdit = !editing || app.currentSession()?.role === 'ADMIN';

const title = computed(() => {
  if (editing) return canEdit ? 'Editar usuario' : 'Detalle del usuario';
  return register ? 'Crea tu cuenta' : 'Añadir integrante';
});
const backTo = register ? '/login' : '/usuarios';

onMounted(async () => {
  if (!editing) return;
  try {
    const user = await app.get({ id });
    name.value = user.name;
    email.value = user.email;
    role.value = user.role;
    status.value = user.status;
    loaded.value = true;
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
});

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    if (editing) {
      await app.update({
        id,
        name: name.value,
        email: email.value,
        role: role.value,
        status: status.value,
        password: password.value || undefined,
      });
    } else {
      await app.create({
        id,
        name: name.value,
        email: email.value,
        password: password.value,
        // El registro público nunca ofrece promoverse a otro rol.
        role: register ? 'MEMBER' : role.value,
      });
    }
    password.value = '';
    success.value = true;
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div :class="{ 'register-page': register }">
    <RouterLink v-if="register" to="/login" class="brand register-brand">
      <span class="brand-dot"></span>Nexo
    </RouterLink>

    <div :class="{ 'register-content': register }">
      <RouterLink :to="backTo" class="back-link">
        <ArrowLeft :size="16" aria-hidden="true" />
        {{ register ? 'Volver a iniciar sesión' : 'Volver al directorio' }}
      </RouterLink>

      <div class="page-heading">
        <div>
          <span class="eyebrow">{{ editing ? 'Usuario existente' : 'Nuevo usuario' }}</span>
          <h1>{{ title }}<span class="heading-dot">.</span></h1>
        </div>
      </div>

      <section v-if="success" class="success-panel" role="status">
        <CircleCheck :size="40" aria-hidden="true" />
        <h2>{{ editing ? 'Cambios guardados' : 'Usuario creado' }}</h2>
        <p v-if="editing">Los datos del usuario se actualizaron correctamente.</p>
        <p v-else>
          La cuenta queda pendiente de activación: un administrador debe activarla antes de que pueda iniciar sesión.
        </p>
        <RouterLink :to="backTo" class="button primary">
          {{ register ? 'Ir a iniciar sesión' : 'Volver al directorio' }}
        </RouterLink>
      </section>

      <div v-else class="form-layout">
        <section class="panel form-panel">
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <p v-if="loading" class="empty">Cargando usuario…</p>
          <p v-if="editing && loaded && !canEdit" class="notice">
            Tu rol permite consultar este usuario, pero no modificarlo.
          </p>

          <form @submit.prevent="submit">
            <fieldset :disabled="busy || !canEdit || !loaded">
              <div class="form-row">
                <div>
                  <label for="user-name">Nombre completo</label>
                  <input id="user-name" v-model="name" type="text" required minlength="3" autocomplete="name" />
                </div>
                <div>
                  <label for="user-email">Correo electrónico</label>
                  <input id="user-email" v-model="email" type="email" required autocomplete="email" />
                </div>
              </div>

              <label for="user-password">Contraseña</label>
              <input
                id="user-password"
                v-model="password"
                type="password"
                minlength="8"
                :required="!editing"
                autocomplete="new-password"
              />
              <p class="field-hint">
                {{ editing ? 'Déjala vacía para conservar la contraseña actual.' : 'Mínimo 8 caracteres.' }}
              </p>

              <div class="form-row">
                <div v-if="!register">
                  <label for="user-role">Rol</label>
                  <select id="user-role" v-model="role">
                    <option v-for="option in USER_ROLES" :key="option" :value="option">{{ roleLabel[option] }}</option>
                  </select>
                </div>
                <div v-if="editing">
                  <label for="user-status">Estado</label>
                  <select id="user-status" v-model="status">
                    <option v-for="option in USER_STATUSES" :key="option" :value="option">{{ statusLabel[option] }}</option>
                  </select>
                </div>
              </div>

              <p class="identifier">Identificador: <code>{{ id }}</code></p>

              <div class="form-actions">
                <RouterLink :to="backTo" class="button secondary">Cancelar</RouterLink>
                <button v-if="canEdit" class="button primary" type="submit">
                  {{ busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar usuario' }}
                </button>
              </div>
            </fieldset>
          </form>
        </section>

        <aside class="form-note">
          <Info :size="20" aria-hidden="true" />
          <h3>Roles</h3>
          <p><strong>Administrador:</strong> crea, edita y elimina.</p>
          <p><strong>Revisor:</strong> consulta el directorio.</p>
          <p><strong>Miembro:</strong> accede a su bienvenida.</p>
          <div class="note-divider"></div>
          <h3>Activación</h3>
          <p>Toda cuenta nueva nace <strong>pendiente</strong>. Un administrador la activa desde la edición.</p>
        </aside>
      </div>
    </div>
  </div>
</template>
