<script setup lang="ts">
defineProps<{
  query: string;
  type: string;
  types: string[];
}>();
const emit = defineEmits<{
  (e: 'update:query', v: string): void;
  (e: 'update:type', v: string): void;
}>();
</script>

<template>
  <div class="filterbar">
    <div class="search">
      <span class="search-icon" aria-hidden="true">⌕</span>
      <input
        class="input search-input"
        type="search"
        placeholder="Search name, maker, color…"
        :value="query"
        aria-label="Search filament"
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="chips" role="group" aria-label="Filter by material">
      <button
        class="chip"
        :class="{ active: type === '' }"
        @click="emit('update:type', '')"
      >
        All
      </button>
      <button
        v-for="t in types"
        :key="t"
        class="chip"
        :class="{ active: type === t }"
        @click="emit('update:type', type === t ? '' : t)"
      >
        {{ t }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.filterbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem 1rem;
  margin: 0.4rem 0 1.6rem;
}
.search {
  position: relative;
  flex: 1 1 220px;
  max-width: 360px;
}
.search-icon {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b5631;
  font-size: 1rem;
}
.search-input {
  padding-left: 1.7rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.chip {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.32rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-ink-dim);
  cursor: pointer;
  transition: all 0.12s ease;
}
.chip:hover {
  color: var(--color-ink);
  border-color: rgba(255, 255, 255, 0.3);
}
.chip.active {
  background: var(--color-brass);
  border-color: var(--color-brass-deep);
  color: #1c1407;
}
.chip:focus-visible {
  outline: 2px solid var(--color-brass);
  outline-offset: 2px;
}
</style>
