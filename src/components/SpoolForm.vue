<script setup lang="ts">
import { computed, reactive, toRaw, watch } from 'vue';
import type { Spool } from '../lib/types';
import { DIAMETERS, MATERIALS, WEIGHTS, materialPreset } from '../lib/materials';
import { normalizeHex } from '../lib/colors';
import SpoolReel from './Spool.vue';

const props = defineProps<{ spool: Spool | null }>();
const emit = defineEmits<{
  (e: 'save', spool: Spool): void;
  (e: 'remove', id: string): void;
  (e: 'close'): void;
}>();

const isNew = !props.spool;

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeForm(s: Spool | null) {
  const preset = MATERIALS[0];
  const base: Spool = s
    ? structuredClone(toRaw(s))
    : {
        id: newId(),
        name: '',
        manufacturer: '',
        type: 'PLA',
        color: { name: '', hex: '#3aa0e0' },
        temps: { nozzleMin: preset.nozzleMin, nozzleMax: preset.nozzleMax, bed: preset.bed },
        count: 1,
        diameter: 1.75,
        weightGrams: 1000,
        purchase: { vendor: '', date: '', price: undefined, currency: 'USD' },
        storage: '',
        notes: '',
      };
  if (!base.purchase) base.purchase = { vendor: '', date: '', price: undefined, currency: 'USD' };
  return reactive(base);
}

const form = makeForm(props.spool);

// Auto-apply temperature presets when the material changes on a *new* spool.
watch(
  () => form.type,
  (t) => {
    if (!isNew) return;
    const p = materialPreset(t);
    if (p) {
      form.temps.nozzleMin = p.nozzleMin;
      form.temps.nozzleMax = p.nozzleMax;
      form.temps.bed = p.bed;
    }
  }
);

function loadPresets() {
  const p = materialPreset(form.type);
  if (p) {
    form.temps.nozzleMin = p.nozzleMin;
    form.temps.nozzleMax = p.nozzleMax;
    form.temps.bed = p.bed;
  }
}

const colorPicker = computed({
  get: () => '#' + normalizeHex(form.color.hex),
  set: (v: string) => {
    form.color.hex = v;
  },
});

const hexValid = computed(() => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.color.hex.trim()));
const nameValid = computed(() => form.name.trim().length > 0);
const typeValid = computed(() => form.type.trim().length > 0);
const valid = computed(() => hexValid.value && nameValid.value && typeValid.value);

const previewSpool = computed<Spool>(() => ({
  ...form,
  color: { name: form.color.name, hex: hexValid.value ? form.color.hex : '#888888' },
}));

function save() {
  if (!valid.value) return;
  const clean: Spool = structuredClone(toRaw(form));
  clean.color.hex = '#' + normalizeHex(clean.color.hex);
  clean.count = Math.max(0, Math.round(Number(clean.count) || 0));
  if (clean.purchase && !clean.purchase.vendor && !clean.purchase.date && clean.purchase.price == null) {
    delete clean.purchase;
  }
  emit('save', clean);
}
</script>

<template>
  <div class="modal-backdrop" @keydown.esc="emit('close')">
    <form class="panel modal-card form" @submit.prevent="save">
      <header class="form-head">
        <h2>{{ isNew ? 'New spool' : 'Edit spool' }}</h2>
        <button type="button" class="x" aria-label="Close" @click="emit('close')">✕</button>
      </header>

      <div class="form-body">
        <!-- Live preview -->
        <div class="preview">
          <div class="preview-reel"><SpoolReel :spool="previewSpool" /></div>
          <span class="preview-hint">live preview</span>
        </div>

        <div class="grid">
          <!-- Identity -->
          <div class="field span2">
            <label for="f-name">Name *</label>
            <input id="f-name" v-model="form.name" class="input" placeholder="Galaxy Black" />
          </div>
          <div class="field">
            <label for="f-maker">Manufacturer</label>
            <input id="f-maker" v-model="form.manufacturer" class="input" placeholder="Prusament" />
          </div>
          <div class="field">
            <label for="f-type">Material *</label>
            <select id="f-type" v-model="form.type" class="input">
              <option v-for="m in MATERIALS" :key="m.key" :value="m.key">{{ m.label }}</option>
            </select>
          </div>

          <!-- Color -->
          <div class="field">
            <label for="f-colorname">Color name</label>
            <input id="f-colorname" v-model="form.color.name" class="input" placeholder="Galaxy Black" />
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <input type="color" v-model="colorPicker" class="swatch" aria-label="Pick color" />
          </div>
          <div class="field">
            <label for="f-hex">Color *</label>
            <input id="f-hex" v-model="form.color.hex" class="input" :class="{ bad: !hexValid }" placeholder="#1b1b2a" />
          </div>

          <!-- Temperatures -->
          <div class="field span2">
            <label>Nozzle °C (min / max)</label>
            <div class="row">
              <input v-model.number="form.temps.nozzleMin" class="input" type="number" inputmode="numeric" />
              <input v-model.number="form.temps.nozzleMax" class="input" type="number" inputmode="numeric" />
            </div>
          </div>
          <div class="field">
            <label for="f-bed">Bed °C</label>
            <input id="f-bed" v-model.number="form.temps.bed" class="input" type="number" inputmode="numeric" />
          </div>
          <div class="field presets-cell">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-ghost" @click="loadPresets">Load {{ form.type }} presets</button>
          </div>

          <!-- Dimensions -->
          <div class="field">
            <label for="f-count">Count</label>
            <input id="f-count" v-model.number="form.count" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label for="f-dia">Diameter (mm)</label>
            <select id="f-dia" v-model.number="form.diameter" class="input">
              <option v-for="d in DIAMETERS" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="field">
            <label for="f-weight">Weight (g)</label>
            <input id="f-weight" v-model.number="form.weightGrams" class="input" type="number" list="weight-list" min="0" />
            <datalist id="weight-list">
              <option v-for="w in WEIGHTS" :key="w" :value="w" />
            </datalist>
          </div>

          <!-- Purchase -->
          <div class="field span2">
            <label for="f-price">Price</label>
            <input id="f-price" v-model.number="form.purchase!.price" class="input" type="number" step="0.01" min="0" placeholder="29.99" />
          </div>
          <div class="field">
            <label for="f-vendor">Bought from</label>
            <input id="f-vendor" v-model="form.purchase!.vendor" class="input" placeholder="Prusa, Amazon…" />
          </div>
          <div class="field">
            <label for="f-date">Purchase date</label>
            <input id="f-date" v-model="form.purchase!.date" class="input" type="date" />
          </div>
          <div class="field span4">
            <label for="f-storage">Storage</label>
            <input id="f-storage" v-model="form.storage" class="input" placeholder="Drybox A, shelf 2…" />
          </div>

          <!-- Notes -->
          <div class="field span4">
            <label for="f-notes">Notes</label>
            <textarea id="f-notes" v-model="form.notes" class="input" rows="2" placeholder="Prints clean, low stringing…"></textarea>
          </div>
        </div>
      </div>

      <footer class="form-foot">
        <button v-if="!isNew" type="button" class="btn btn-danger" @click="emit('remove', form.id)">Delete</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-brass" :disabled="!valid">Save spool</button>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.form {
  padding: 0;
  width: min(680px, 100%);
}
.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.3rem;
  border-bottom: 1px solid var(--color-kraft-line);
}
.form-head h2 {
  margin: 0;
  font-size: 1.25rem;
}
.x {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #5b4a2c;
  padding: 0.3rem;
}
.form-body {
  display: flex;
  gap: 1.2rem;
  padding: 1.2rem 1.3rem;
}
.preview {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.3rem;
}
.preview-reel {
  pointer-events: none;
}
.preview-hint {
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b5631;
}
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.7rem;
  min-width: 0;
}
.span2 {
  grid-column: span 2;
}
.span4 {
  grid-column: span 4;
}
.row {
  display: flex;
  gap: 0.4rem;
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
.presets-cell .btn {
  white-space: nowrap;
  font-size: 0.66rem;
  padding: 0.45rem 0.5rem;
}
.form-foot {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1.3rem;
  border-top: 1px solid var(--color-kraft-line);
}
.spacer {
  flex: 1;
}
textarea.input {
  resize: vertical;
  font-family: var(--font-mono);
}

@media (max-width: 560px) {
  .form-body {
    flex-direction: column;
    align-items: center;
  }
  .grid {
    grid-template-columns: repeat(2, 1fr);
    width: 100%;
  }
  .span2,
  .span4 {
    grid-column: span 2;
  }
}
</style>
