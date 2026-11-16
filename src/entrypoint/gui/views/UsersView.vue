<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Pencil, RefreshCw, Search, Trash2, TriangleAlert, UserPlus, X } from 'lucide-vue-next';
import { USER_STATUSES } from '../../../domain/constants/user';
import type { UserResponse } from '../../../application/dto/responses/user-responses';
import { errorMessage, roleLabel, statusLabel, useApplication } from '../context';

const route = useRoute();
const app = useApplication();
const session = app.currentSession();

const users = ref<UserResponse[]>([]);
const search = ref('');
const status = ref('');
const busy = ref(false);
const deleting = ref(false);
const error = ref('');
const success = ref('');
const selected = ref<UserResponse | null>(null);
const page = ref(1);
const pageSize = 8;
const cancelButton = ref<HTMLButtonElement | null>(null);
let previousFocus: HTMLElement | null = null;

const canRead = session?.role === 'ADMIN' || session?.role === 'REVIEWER';
const admin = session?.role === 'ADMIN';

const heading = computed(() => {
  if (route.meta.mode === 'edit') {
    return { title: 'Elige a quién editar', text: 'Busca a la persona y abre su ficha para modificarla.' };
  }
  if (route.meta.mode === 'delete') {
    return { title: 'Elige a quién eliminar', text: 'Busca a la persona y confirma la eliminación.' };
  }
  return { title: 'Directorio de usuarios', text: 'Consulta, filtra y administra las cuentas del espacio.' };
});

// Filtrado local sobre lo ya descargado: no llama a la red por cada tecla.
const filtered = computed(() => {
  const text = search.value.trim().toLowerCase();
  return users.value.filter((user) =>
    `${user.name} ${user.email} ${user.id}`.toLowerCase().includes(text)
    && (!status.value || user.status === status.value));
});
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const currentPage = computed(() => Math.min(page.value, pages.value));
const visible = computed(() =>
  filtered.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize));

async function load() {
  if (!canRead) return;
  busy.value = true;
  error.value = '';
  try {
    users.value = await app.list();
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    busy.value = false;
  }
}
onMounted(load);

async function confirm(user: UserResponse) {
  previousFocus = document.activeElement as HTMLElement | null;
  error.value = '';
  selected.value = user;
  // El modal se crea con v-if: hay que esperar al DOM antes de enfocar.
  await nextTick();
  cancelButton.value?.focus();
}

function close() {
  if (deleting.value) return;
  selected.value = null;
  if (previousFocus?.isConnected) previousFocus.focus();
}

async function remove() {
  if (!selected.value) return;
  deleting.value = true;
  error.value = '';
  try {
    const { id, name } = selected.value;
    await app.delete({ id: selected.value!.id });
    // Solo después del éxito del servidor quitamos la fila local.
    users.value = users.value.filter((user) => user.id !== id);
    success.value = `Usuario eliminado: ${name}.`;
    deleting.value = false;
    close();
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    deleting.value = false;
  }
}

function trap(event: KeyboardEvent) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget as HTMLElement;
  const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  if (!buttons.length) return;
  const first = buttons[0]!;
  const last = buttons[buttons.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">Usuarios</span>
      <h1>{{ heading.title }}<span class="heading-dot">.</span></h1>
      <p class="muted">{{ heading.text }}</p>
    </div>
    <RouterLink to="/usuarios/crear" class="button primary">
      <UserPlus :size="18" aria-hidden="true" /> Crear usuario
    </RouterLink>
  </div>

  <p v-if="error && !selected" class="error" role="alert">{{ error }}</p>
  <p v-if="success" class="success" role="status">{{ success }}</p>

  <p v-if="!canRead" class="empty panel">
    Tu rol no permite consultar el directorio. Pide acceso a un administrador.
  </p>

  <section v-else class="panel">
    <div class="panel-heading">
      <h2>Personas <span class="count">{{ filtered.length }}</span></h2>
      <button type="button" class="button secondary compact" :disabled="busy" @click="load">
        <RefreshCw :size="16" aria-hidden="true" /> Actualizar
      </button>
    </div>

    <div class="filters">
      <div class="search-field">
        <Search :size="17" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          aria-label="Buscar usuarios"
          placeholder="Buscar por nombre, correo o ID"
          @input="page = 1"
        />
      </div>
      <select v-model="status" aria-label="Filtrar por estado" @change="page = 1">
        <option value="">Todos los estados</option>
        <option v-for="option in USER_STATUSES" :key="option" :value="option">{{ statusLabel[option] }}</option>
      </select>
    </div>

    <p v-if="busy && !users.length" class="empty">Cargando usuarios…</p>
    <p v-else-if="!visible.length" class="empty">
      No hay usuarios que coincidan. Limpia los filtros o crea un usuario nuevo.
    </p>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          <tr v-for="user in visible" :key="user.id">
            <td>
              <div class="user-cell">
                <span class="avatar" aria-hidden="true">{{ user.name.slice(0, 2).toUpperCase() }}</span>
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
                :aria-label="`${admin ? 'Editar' : 'Consultar'} ${user.name}`"
              >
                <Pencil :size="16" aria-hidden="true" />
              </RouterLink>
              <button
                v-if="admin"
                type="button"
                class="icon-button danger-icon"
                :aria-label="`Eliminar ${user.name}`"
                @click="confirm(user)"
              >
                <Trash2 :size="16" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <span class="muted">{{ filtered.length }} resultado(s) · Página {{ currentPage }} de {{ pages }}</span>
      <div>
        <button type="button" class="button secondary compact" :disabled="currentPage <= 1" @click="page = currentPage - 1">
          Anterior
        </button>
        <button type="button" class="button secondary compact" :disabled="currentPage >= pages" @click="page = currentPage + 1">
          Siguiente
        </button>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <div v-if="selected" class="modal-overlay" @click.self="close" @keydown.esc="close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" @keydown="trap">
        <button type="button" class="modal-close" aria-label="Cerrar" :disabled="deleting" @click="close">
          <X :size="18" aria-hidden="true" />
        </button>
        <span class="delete-icon"><TriangleAlert :size="24" aria-hidden="true" /></span>
        <h2 id="delete-title">¿Eliminar a {{ selected.name }}?</h2>
        <p class="muted">Esta acción no se puede deshacer. Se eliminará la cuenta {{ selected.email }}.</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="form-actions">
          <button ref="cancelButton" type="button" class="button secondary" :disabled="deleting" @click="close">
            Cancelar
          </button>
          <button type="button" class="button danger" :disabled="deleting" @click="remove">
            {{ deleting ? 'Eliminando…' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
