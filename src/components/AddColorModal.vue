<script setup lang="ts">
import { computed, reactive } from 'vue';
import { normalizeHex } from '../lib/colors';

const emit = defineEmits<{
  (e: 'add', color: { name: string; hex: string }): void;
  (e: 'close'): void;
}>();

const form = reactive({
  name: '',
  hex: '#3aa0e0',
});

const colorPicker = computed({
  get: () => '#' + normalizeHex(form.hex),
  set: (v: string) => {
    form.hex = v;
  },
});

const hexValid = computed(() => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.hex.trim()));

function confirm() {
  if (!hexValid.value) return;
  emit('add', { name: form.name.trim(), hex: '#' + normalizeHex(form.hex) });
}
</script>

<template>
  <div class="modal-backdrop" style="z-index: 60" @click.self="emit('close')" @keydown.esc="emit('close')">
    <form class="panel modal-card color-modal" @submit.prevent="confirm">
      <h2 class="color-modal-title">Add Color</h2>

      <div class="field">
        <label for="ac-name">Color name</label>
        <input id="ac-name" v-model="form.name" class="input" placeholder="Galaxy Black" />
      </div>

      <div class="color-row">
        <input type="color" v-model="colorPicker" class="swatch" aria-label="Pick color" />
        <div class="field" style="flex: 1">
          <label for="ac-hex">Hex *</label>
          <input id="ac-hex" v-model="form.hex" class="input" :class="{ bad: !hexValid }" placeholder="#1b1b2a" />
        </div>
      </div>

      <div class="color-modal-actions">
        <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-brass" :disabled="!hexValid">Add Color</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.color-modal {
  padding: 1.4rem 1.5rem;
  width: min(320px, 100%);
}
.color-modal-title {
  margin: 0 0 1rem;
  font-size: 1.2rem;
}
.color-row {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}
.swatch {
  flex: none;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--color-kraft-line);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}
.input.bad {
  border-color: #c2603f;
  outline-color: #c2603f;
}
.color-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
}
</style>
