<script setup lang="ts">
import { computed } from 'vue';
import type { Spool } from '../lib/types';
import { sortByRoygbiv } from '../lib/colors';
import SpoolReel from './Spool.vue';

const props = defineProps<{
  label: string;
  blurb?: string;
  spools: Spool[];
}>();
const emit = defineEmits<{ (e: 'select', spool: Spool): void }>();

const sorted = computed(() => sortByRoygbiv(props.spools, (s) => s.color.hex));
const totalCount = computed(() => props.spools.reduce((sum, s) => sum + (s.count || 0), 0));
const colorCount = computed(() => new Set(props.spools.map((s) => s.color.hex.toLowerCase())).size);
</script>

<template>
  <section class="shelf">
    <header class="shelf-head">
      <h2 class="shelf-name">{{ label }}</h2>
      <span v-if="blurb" class="shelf-blurb">{{ blurb }}</span>
      <span class="shelf-stats">{{ totalCount }} spool{{ totalCount === 1 ? '' : 's' }} · {{ colorCount }} color{{ colorCount === 1 ? '' : 's' }}</span>
    </header>

    <div class="shelf-stage">
      <div class="shelf-track">
        <SpoolReel v-for="s in sorted" :key="s.id" :spool="s" @select="emit('select', $event)" />
      </div>
      <div class="plank" aria-hidden="true"></div>
    </div>
  </section>
</template>

<style scoped>
.shelf {
  margin-bottom: 2.4rem;
}

.shelf-head {
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  padding: 0 4px 0.5rem;
  flex-wrap: wrap;
}
.shelf-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-ink);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
}
.shelf-blurb {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-brass);
}
.shelf-stats {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--color-ink-dim);
}

.shelf-stage {
  position: relative;
}

.shelf-track {
  display: flex;
  align-items: flex-end;
  gap: 0.4rem 1.2rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 22px 24px;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: var(--color-oak-dark) transparent;
}
.shelf-track > :deep(.spool) {
  scroll-snap-align: start;
  flex: none;
}

/* The wooden plank the reels rest on. */
.plank {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 24px;
  border-radius: 2px 2px 4px 4px;
  background:
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.05) 0 3px, transparent 3px 12px),
    linear-gradient(
      180deg,
      var(--color-oak) 0%,
      var(--color-oak-dark) 60%,
      var(--color-oak-edge) 100%
    );
  border-top: 1px solid rgba(255, 240, 214, 0.28);
  box-shadow:
    inset 0 2px 2px rgba(255, 255, 255, 0.18),
    inset 0 -3px 4px rgba(0, 0, 0, 0.35),
    0 16px 20px -12px rgba(0, 0, 0, 0.75);
}

/* Edge fades hint that the shelf scrolls. */
.shelf-stage::before,
.shelf-stage::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 24px;
  width: 26px;
  pointer-events: none;
  z-index: 3;
}
.shelf-stage::before {
  left: 0;
  background: linear-gradient(90deg, var(--color-wall), transparent);
}
.shelf-stage::after {
  right: 0;
  background: linear-gradient(270deg, var(--color-wall), transparent);
}
</style>
