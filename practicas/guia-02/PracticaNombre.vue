<!--
  Práctica de la guía 02 (sección 12). No forma parte de Nexo.

  Para verla funcionando sin tocar la aplicación:
    1. Copia este archivo a src/PracticaNombre.vue
    2. En src/main.ts cambia temporalmente la última expresión por:
         import Practica from './PracticaNombre.vue';
         createApp(Practica).mount('#app');
    3. npm run dev  → al terminar, deshaz los dos cambios.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';

const name = ref('Ana');

// Paso 2: un resultado derivado. Se recalcula solo cuando cambia `name`.
const upperName = computed(() => name.value.toUpperCase());

// Paso 3: condición para el aviso.
const tooShort = computed(() => name.value.trim().length < 3);

// Paso 1: el botón cambia el estado; el input y el saludo lo siguen.
function setMaria() {
  name.value = 'María';
}
</script>

<template>
  <label for="practice-name">Nombre</label>
  <input id="practice-name" v-model="name" />

  <button type="button" @click="setMaria">Cambiar a María</button>

  <p>Hola, {{ name }}</p>
  <p>En mayúsculas: {{ upperName }}</p>

  <p v-if="tooShort" role="alert">El nombre debe tener al menos tres caracteres.</p>
</template>
