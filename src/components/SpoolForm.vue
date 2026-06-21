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
        temps: { nozzleMin: preset.nozzleMin, nozzleMax: preset.nozzleMax, bedMin: preset.bed, bedMax: preset.bed },
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
      form.temps.bedMin = p.bed;
      form.temps.bedMax = p.bed;
    }
  }
);

function loadPresets() {
  const p = materialPreset(form.type);
  if (p) {
    form.temps.nozzleMin = p.nozzleMin;
    form.temps.nozzleMax = p.nozzleMax;
    form.temps.bedMin = p.bed;
    form.temps.bedMax = p.bed;
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
          <div class="count-tag">
            <label for="f-count">Count</label>
            <select id="f-count" v-model.number="form.count" class="count-select">
              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
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
            <label>Bed °C (min / max)</label>
            <div class="row">
              <input v-model.number="form.temps.bedMin" class="input" type="number" inputmode="numeric" />
              <input v-model.number="form.temps.bedMax" class="input" type="number" inputmode="numeric" />
            </div>
          </div>
          <div class="field presets-cell">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-ghost" @click="loadPresets">Load {{ form.type }} presets</button>
          </div>

          <!-- Dimensions -->
          <div class="field">
            <label for="f-dia">Diameter (mm)</label>
            <select id="f-dia" v-model.number="form.diameter" class="input">
              <option v-for="d in DIAMETERS" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="field span2">
            <label for="f-weight">Weight (g)</label>
            <input id="f-weight" v-model.number="form.weightGrams" class="input" type="number" list="weight-list" min="0" />
            <datalist id="weight-list">
              <option v-for="w in WEIGHTS" :key="w" :value="w" />
            </datalist>
          </div>

          <!-- Purchase (explicit row to avoid auto-flow collision with dimensions) -->
          <div class="field purchase-price">
            <label for="f-price">Price</label>
            <input id="f-price" v-model.number="form.purchase!.price" class="input" type="number" step="0.01" min="0" placeholder="29.99" />
          </div>
          <div class="field purchase-vendor">
            <label for="f-vendor">Bought from</label>
            <input id="f-vendor" v-model="form.purchase!.vendor" class="input" placeholder="Prusa, Amazon…" />
          </div>
          <div class="field purchase-date">
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
.preview-reel :deep(.tag::before) {
  display: none;
}
.preview-hint {
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b5631;
}
.count-tag {
  margin-top: -6px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.45rem 0.28rem 0.4rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.06)),
    var(--color-kraft);
  color: #2a2012;
  border: 1px solid var(--color-kraft-line);
  border-radius: 3px;
  box-shadow: 0 4px 8px -4px rgba(0, 0, 0, 0.6);
  transform: rotate(-1.5deg);
  font-family: var(--font-mono);
}
.count-tag label {
  font-size: 0.55rem;
  font-weight: 600;
  color: #6b5631;
  text-transform: uppercase;
  letter-spacing: 0.09em;
}
.purchase-price,
.purchase-vendor,
.purchase-date {
  grid-column: span 1;
}
.purchase-price { grid-column: 1; grid-row: 5; }
.purchase-vendor { grid-column: 2; grid-row: 5; }
.purchase-date { grid-column: 3; grid-row: 5; }
.count-select {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 600;
  padding: 0.15rem 0.3rem;
  border: 1px solid var(--color-kraft-line);
  border-radius: 2px;
  background: #fffdf6;
  color: #2a2012;
  cursor: pointer;
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
