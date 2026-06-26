<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Spool } from '../lib/types';
import { INVENTORY_VERSION } from '../lib/types';
import { ApiError, getInventory, saveInventory } from '../lib/api';
import { materialPreset, shelfRank } from '../lib/materials';
import { sortByRoygbiv } from '../lib/colors';
import { newId } from '../lib/id';
import Shelf from './Shelf.vue';
import FilterBar from './FilterBar.vue';
import SpoolForm from './SpoolForm.vue';
import PinPrompt from './PinPrompt.vue';
import { SAMPLE_SPOOLS } from '../lib/sample';

const spools = ref<Spool[]>([]);
const loading = ref(true);
const loadError = ref('');

const query = ref('');
const typeFilter = ref('');
const colorFilter = ref<string | null>(null);

const formOpen = ref(false);
const editing = ref<Spool | null>(null);
const siblings = ref<Spool[]>([]);

const pin = ref('');
const pinOpen = ref(false);
const pinError = ref('');
let afterPin: (() => void) | null = null;

const saving = ref(false);
const banner = ref<{ kind: 'ok' | 'err'; msg: string } | null>(null);
let bannerTimer: ReturnType<typeof setTimeout> | undefined;

const importEl = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  pin.value = sessionStorage.getItem('fw-edit-pin') || '';
  try {
    const doc = await getInventory();
    spools.value = (doc.spools || []).map((s: Spool) => s.spool_id ? s : { ...s, spool_id: newId() });
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Could not load inventory.';
  } finally {
    loading.value = false;
  }
});

// ---- derived views -----------------------------------------------------
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return spools.value.filter((s) => {
    if (typeFilter.value && s.type !== typeFilter.value) return false;
    if (colorFilter.value && s.color.hex.toLowerCase() !== colorFilter.value) return false;
    if (!q) return true;
    return [s.name, s.manufacturer, s.color.name, s.type].some((v) =>
      (v || '').toLowerCase().includes(q)
    );
  });
});

function toggleColor(hex: string) {
  const h = hex.toLowerCase();
  colorFilter.value = colorFilter.value === h ? null : h;
}

const groups = computed(() => {
  const map = new Map<string, Spool[]>();
  for (const s of filtered.value) {
    const arr = map.get(s.type) || [];
    arr.push(s);
    map.set(s.type, arr);
  }
  return [...map.keys()]
    .sort((a, b) => shelfRank(a) - shelfRank(b) || a.localeCompare(b))
    .map((key) => ({ key, label: key, blurb: materialPreset(key)?.blurb, spools: map.get(key)! }));
});

const presentTypes = computed(() =>
  [...new Set(spools.value.map((s) => s.type))].sort(
    (a, b) => shelfRank(a) - shelfRank(b) || a.localeCompare(b)
  )
);

const spectrum = computed(() => {
  const map = new Map<string, { hex: string; name: string; count: number }>();
  for (const s of spools.value) {
    const key = s.color.hex.toLowerCase();
    const e = map.get(key) || { hex: s.color.hex, name: s.color.name, count: 0 };
    e.count += s.count || 0;
    map.set(key, e);
  }
  return sortByRoygbiv([...map.values()], (c) => c.hex);
});

const stats = computed(() => {
  const total = spools.value.reduce((n, s) => n + (s.count || 0), 0);
  const weightKg = spools.value.reduce((n, s) => n + (s.count || 0) * (s.weightGrams || 0), 0) / 1000;
  return { total, skus: spools.value.length, colors: spectrum.value.length, weightKg };
});

// ---- pin + persistence -------------------------------------------------
function requirePin(action: () => void) {
  if (pin.value) {
    action();
    return;
  }
  afterPin = action;
  pinError.value = '';
  pinOpen.value = true;
}

function onPinSubmit(value: string) {
  pin.value = value;
  sessionStorage.setItem('fw-edit-pin', value);
  pinOpen.value = false;
  const run = afterPin;
  afterPin = null;
  run?.();
}

function flash(kind: 'ok' | 'err', msg: string) {
  banner.value = { kind, msg };
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (banner.value = null), 2600);
}

function persist(next: Spool[]) {
  requirePin(async () => {
    const prev = spools.value;
    spools.value = next;
    saving.value = true;
    try {
      const doc = await saveInventory(next, pin.value);
      spools.value = doc.spools;
      flash('ok', 'Saved to Upstash');
    } catch (e) {
      spools.value = prev;
      if (e instanceof ApiError && e.status === 401) {
        pin.value = '';
        sessionStorage.removeItem('fw-edit-pin');
        pinError.value = 'Incorrect PIN — try again.';
        afterPin = () => persist(next);
        pinOpen.value = true;
      } else {
        flash('err', e instanceof Error ? e.message : 'Save failed');
      }
    } finally {
      saving.value = false;
    }
  });
}

// ---- actions -----------------------------------------------------------
function openNew() {
  editing.value = null;
  siblings.value = [];
  formOpen.value = true;
}
function openEdit(spool: Spool) {
  editing.value = spool;
  siblings.value = spool.spool_id
    ? spools.value.filter((s) => s.spool_id === spool.spool_id)
    : [spool];
  formOpen.value = true;
}
function onSave(newSpools: Spool[]) {
  if (newSpools.length === 0) return;
  const groupId = newSpools[0].spool_id;
  let next: Spool[];
  if (groupId && spools.value.some((s) => s.spool_id === groupId)) {
    next = [...spools.value.filter((s) => s.spool_id !== groupId), ...newSpools];
  } else {
    next = [...spools.value, ...newSpools];
  }
  formOpen.value = false;
  persist(next);
}
function loadSample() {
  persist(structuredClone(SAMPLE_SPOOLS).map((s) => s.spool_id ? s : { ...s, spool_id: newId() }));
}

function exportJson() {
  const doc = {
    version: INVENTORY_VERSION,
    updatedAt: new Date().toISOString(),
    spools: spools.value,
  };
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filament-inventory.json';
  a.click();
  URL.revokeObjectURL(url);
}

function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const doc = JSON.parse(String(reader.result));
      if (!Array.isArray(doc.spools)) throw new Error('No "spools" array found');
      persist(doc.spools.map((s: Spool) => s.spool_id ? s : { ...s, spool_id: newId() }));
    } catch (err) {
      flash('err', `Invalid file: ${err instanceof Error ? err.message : 'parse error'}`);
    }
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = '';
}
</script>

<template>
  <div class="wall">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="counts">
        <strong>{{ stats.total }}</strong> spools
        <span class="dot">·</span> {{ stats.skus }} SKUs
        <span class="dot">·</span> {{ stats.colors }} colors
        <span v-if="stats.weightKg > 0" class="dot">·</span>
        <span v-if="stats.weightKg > 0">{{ stats.weightKg.toFixed(1) }} kg</span>
      </div>
      <div class="actions">
        <span v-if="saving" class="saving">saving…</span>
        <button class="btn btn-ghost" @click="exportJson" :disabled="spools.length === 0">Export</button>
        <button class="btn btn-ghost" @click="importEl?.click()">Import</button>
        <input ref="importEl" type="file" accept="application/json,.json" class="hidden-file" @change="onImportFile" />
        <button class="btn btn-brass" @click="openNew">+ Add spool</button>
      </div>
    </div>

    <transition name="fade">
      <div v-if="banner" class="banner" :class="banner.kind">{{ banner.msg }}</div>
    </transition>

    <!-- Loading / error -->
    <div v-if="loading" class="state">Opening the workshop…</div>
    <div v-else-if="loadError" class="state panel err-panel">{{ loadError }}</div>

    <template v-else>
      <!-- Spectrum strip -->
      <div v-if="spectrum.length" class="spectrum" aria-label="Color spectrum of the whole collection">
        <span
          v-for="c in spectrum"
          :key="c.hex"
          class="swatch"
          :class="{ active: colorFilter === c.hex.toLowerCase() }"
          :style="{ background: c.hex }"
          :title="`${c.name || c.hex} — ${c.count} spool${c.count === 1 ? '' : 's'}`"
          @click="toggleColor(c.hex)"
        ></span>
      </div>
      <div v-if="colorFilter" class="color-filter-bar">
        <span class="color-filter-label">
          Showing only
          <span class="color-dot" :style="{ background: colorFilter }"></span>
          {{ spectrum.find((c) => c.hex.toLowerCase() === colorFilter)?.name || colorFilter }}
        </span>
        <button class="btn btn-ghost btn-xs" @click="colorFilter = null">Clear</button>
      </div>

      <FilterBar v-model:query="query" v-model:type="typeFilter" :types="presentTypes" />

      <!-- Empty state -->
      <div v-if="spools.length === 0" class="empty panel">
        <h2>Your shelves are empty</h2>
        <p>Add your first spool, or drop in a starter set to see how it looks.</p>
        <div class="empty-actions">
          <button class="btn btn-brass" @click="openNew">+ Add a spool</button>
          <button class="btn btn-ghost" @click="loadSample">Load sample set</button>
        </div>
      </div>

      <!-- No matches for filter -->
      <div v-else-if="groups.length === 0" class="state">No spools match your filter.</div>

      <!-- Shelves -->
      <Shelf
        v-for="g in groups"
        :key="g.key"
        :label="g.label"
        :blurb="g.blurb"
        :spools="g.spools"
        @select="openEdit"
      />
    </template>

    <SpoolForm v-if="formOpen" :spool="editing" :siblings="siblings" @save="onSave" @close="formOpen = false" />
    <PinPrompt v-if="pinOpen" :error="pinError" @submit="onPinSubmit" @close="pinOpen = false" />
  </div>
</template>

<style scoped>
.wall {
  position: relative;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-bottom: 1rem;
}
.counts {
  font-size: 0.78rem;
  color: var(--color-ink-dim);
}
.counts strong {
  color: var(--color-ink);
  font-size: 0.95rem;
}
.dot {
  opacity: 0.5;
  margin: 0 0.15rem;
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.saving {
  font-size: 0.72rem;
  color: var(--color-brass);
  margin-right: 0.3rem;
}
.hidden-file {
  display: none;
}

.banner {
  position: fixed;
  bottom: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.55rem 1rem;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 600;
  z-index: 60;
  box-shadow: 0 10px 24px -10px rgba(0, 0, 0, 0.8);
}
.banner.ok {
  background: #2f5e3a;
  color: #d9f2dd;
}
.banner.err {
  background: #7a2f1f;
  color: #f6d8cd;
}

.state {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--color-ink-dim);
  font-size: 0.85rem;
}
.err-panel {
  color: #7a2f1f;
  padding: 1.2rem;
  text-align: center;
}

.spectrum {
  display: flex;
  height: 16px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.2rem;
  border: 1px solid rgba(0, 0, 0, 0.5);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
}
.spectrum .swatch {
  flex: 1 1 0;
  min-width: 3px;
  transition: flex-grow 0.15s ease;
  cursor: pointer;
}
.spectrum .swatch:hover {
  flex-grow: 2.4;
}
.spectrum .swatch.active {
  flex-grow: 3;
  outline: 2px solid var(--color-brass);
  outline-offset: -1px;
}

.color-filter-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
  margin-bottom: 0.8rem;
  font-size: 0.78rem;
  color: var(--color-ink-dim);
}
.color-filter-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.5);
}
.btn-xs {
  padding: 0.15rem 0.5rem;
  font-size: 0.7rem;
  border-radius: 3px;
  border: 1px solid var(--color-oak-dark);
  background: transparent;
  color: var(--color-ink-dim);
  cursor: pointer;
}
.btn-xs:hover {
  border-color: var(--color-brass);
  color: var(--color-brass);
}

.empty {
  text-align: center;
  padding: 2.4rem 1.4rem;
  margin-top: 1rem;
}
.empty h2 {
  margin: 0 0 0.5rem;
}
.empty p {
  margin: 0 0 1.2rem;
  color: #5b4a2c;
  font-size: 0.85rem;
}
.empty-actions {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
