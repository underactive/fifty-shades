<script setup lang="ts">
import { ref, onMounted } from 'vue';

defineProps<{ error?: string }>();
const emit = defineEmits<{ (e: 'submit', pin: string): void; (e: 'close'): void }>();

const pin = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

onMounted(() => inputEl.value?.focus());

function submit() {
  if (pin.value.trim()) emit('submit', pin.value.trim());
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <form class="panel modal-card pin" @submit.prevent="submit">
      <h2 class="pin-title">Workshop locked</h2>
      <p class="pin-copy">Enter your edit PIN to add or change spools. Viewing stays open to all.</p>

      <div class="field">
        <label for="pin">Edit PIN</label>
        <input
          id="pin"
          ref="inputEl"
          v-model="pin"
          class="input"
          type="password"
          autocomplete="off"
          placeholder="••••••"
        />
      </div>

      <p v-if="error" class="pin-error">{{ error }}</p>

      <div class="pin-actions">
        <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-brass" :disabled="!pin.trim()">Unlock</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.pin {
  padding: 1.4rem 1.5rem;
  width: min(380px, 100%);
}
.pin-title {
  margin: 0 0 0.4rem;
  font-size: 1.3rem;
}
.pin-copy {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  color: #5b4a2c;
  line-height: 1.4;
}
.pin-error {
  margin: 0.6rem 0 0;
  font-size: 0.75rem;
  color: #9a3b1f;
  font-weight: 600;
}
.pin-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.2rem;
}
</style>
