<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue';
import type { Spool, GalleryVariant } from '../lib/types';
import { DIAMETERS, MATERIALS, WEIGHTS, materialPreset } from '../lib/materials';
import { normalizeHex } from '../lib/colors';
import { newId } from '../lib/id';
import SpoolReel from './Spool.vue';
import AddColorModal from './AddColorModal.vue';

const props = defineProps<{ spool: Spool | null; siblings?: Spool[] }>();
const emit = defineEmits<{
  (e: 'save', spools: Spool[]): void;
  (e: 'close'): void;
}>();

const isEditing = !!props.spool;
const groupId = props.siblings?.[0]?.spool_id || newId();

function makeShared(s: Spool | null) {
  const preset = MATERIALS[0];
  return reactive({
    name: s?.name || '',
    manufacturer: s?.manufacturer || '',
    type: s?.type || 'PLA',
    temps: s?.temps
      ? { ...s.temps }
      : { nozzleMin: preset.nozzleMin, nozzleMax: preset.nozzleMax, bedMin: preset.bed, bedMax: preset.bed },
    diameter: s?.diameter ?? 1.75,
    weightGrams: s?.weightGrams ?? 1000,
    purchase: s?.purchase
      ? { ...s.purchase }
      : { vendor: '', date: '', price: undefined, currency: 'USD' as const },
    storage: s?.storage || '',
    notes: s?.notes || '',
  });
}

function makeVariants(siblings: Spool[] | undefined, s: Spool | null): GalleryVariant[] {
  if (siblings && siblings.length > 0) {
    return siblings.map((sp) => ({
      id: sp.id,
      spool_id: sp.spool_id || groupId,
      color: { name: sp.color.name, hex: sp.color.hex },
      count: sp.count,
    }));
  }
  // New spool: start with empty variants so color fields show in grid.
  // save() fallback creates the first variant from initColor fields.
  return [];
}

const shared = makeShared(props.spool);
const variants = reactive<GalleryVariant[]>(makeVariants(props.siblings, props.spool));
const selectedVariantId = ref(variants[0]?.id || '');
const addColorOpen = ref(false);
const deleteConfirmId = ref('');
const editingVariantId = ref('');
const editColor = reactive({ name: '', hex: '#3aa0e0' });

// Auto-apply temperature presets when the material changes on a *new* spool.
watch(
  () => shared.type,
  (t) => {
    if (isEditing) return;
    const p = materialPreset(t);
    if (p) {
      shared.temps.nozzleMin = p.nozzleMin;
      shared.temps.nozzleMax = p.nozzleMax;
      shared.temps.bedMin = p.bed;
      shared.temps.bedMax = p.bed;
    }
  }
);



// --- Initial color fields (shown only when variants.length === 0 for new spools) ---

const initColor = reactive({ name: '', hex: '#3aa0e0' });

const initColorPicker = computed({
  get: () => '#' + normalizeHex(initColor.hex),
  set: (v: string) => { initColor.hex = v; },
});

const hexValid = computed(() => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(initColor.hex.trim()));
const nameValid = computed(() => shared.name.trim().length > 0);
const typeValid = computed(() => shared.type.trim().length > 0);
const valid = computed(() => {
  if (variants.length > 0) return nameValid.value && typeValid.value;
  return hexValid.value && nameValid.value && typeValid.value;
});

// --- Gallery helpers ---

function variantToSpool(v: GalleryVariant): Spool {
  return {
    ...toRaw(shared),
    id: v.id,
    spool_id: v.spool_id,
    color: { name: v.color.name, hex: v.color.hex },
    count: v.count,
  };
}

function onAddColor(color: { name: string; hex: string }) {
  variants.push({ id: newId(), spool_id: groupId, color, count: 1 });
  addColorOpen.value = false;
}

function selectVariant(id: string) {
  selectedVariantId.value = id;
  editingVariantId.value = '';
}

function startEdit(v: GalleryVariant) {
  editingVariantId.value = v.id;
  editColor.name = v.color.name;
  editColor.hex = v.color.hex;
  deleteConfirmId.value = '';
}

function saveEdit() {
  const v = variants.find((x) => x.id === editingVariantId.value);
  if (v) {
    v.color.name = editColor.name;
    v.color.hex = editColor.hex;
  }
  editingVariantId.value = '';
}

function cancelEdit() {
  editingVariantId.value = '';
}

function requestDelete(id: string) {
  editingVariantId.value = '';
  deleteConfirmId.value = id;
}

function confirmDelete(id: string) {
  const idx = variants.findIndex((v) => v.id === id);
  if (idx >= 0) variants.splice(idx, 1);
  deleteConfirmId.value = '';
}

function cancelDelete() {
  deleteConfirmId.value = '';
}

// --- Save ---

function save() {
  if (!valid.value) return;

  // For new spools with no variants yet, create the first variant from initial color fields
  if (variants.length === 0) {
    variants.push({
      id: newId(),
      spool_id: groupId,
      color: { name: initColor.name, hex: '#' + normalizeHex(initColor.hex) },
      count: 1,
    });
  }

  const spools: Spool[] = variants.map((v) => {
    const spool: Spool = {
      ...structuredClone(toRaw(shared)),
      id: v.id,
      spool_id: v.spool_id,
      color: { name: v.color.name, hex: '#' + normalizeHex(v.color.hex) },
      count: Math.max(0, Math.round(Number(v.count) || 0)),
    };
    if (spool.purchase && !spool.purchase.vendor && !spool.purchase.date && spool.purchase.price == null) {
      delete spool.purchase;
    }
    return spool;
  });

  emit('save', spools);
}
</script>

<template>
  <div class="modal-backdrop" @keydown.esc="emit('close')">
    <form class="panel modal-card form" @submit.prevent="save">
      <header class="form-head">
        <h2>{{ isEditing ? 'Edit spool' : 'New spool' }}</h2>
        <button type="button" class="x" aria-label="Close" @click="emit('close')">✕</button>
      </header>

      <div class="form-body">
        <!-- Gallery / preview area -->
        <div class="preview">
          <!-- Add Color button (top of gallery) -->
          <button v-if="isEditing || variants.length > 0" type="button" class="btn btn-ghost add-color-btn" @click="addColorOpen = true">+ Add Color</button>

          <!-- Empty state -->
          <div v-if="variants.length === 0 && !isEditing" class="gallery-empty">
            <span class="empty-text">No colors yet</span>
          </div>

          <!-- Gallery items -->
          <div v-for="v in variants" :key="v.id" class="gallery-item" :class="{ selected: v.id === selectedVariantId }" @click="selectVariant(v.id)">
            <div class="mini-reel">
              <SpoolReel :spool="variantToSpool(v)" @select.stop />
            </div>
            <div class="mini-count-tag">
              <select v-model.number="v.count" class="mini-count-select" @click.stop>
                <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
            <!-- Edit / Delete links -->
            <div class="mini-actions" @click.stop>
              <template v-if="deleteConfirmId !== v.id && editingVariantId !== v.id">
                <button type="button" class="action-link edit-link" @click="startEdit(v)">Edit</button>
                <span class="action-sep">|</span>
                <button type="button" class="action-link delete-link" @click="requestDelete(v.id)">Delete</button>
              </template>
              <template v-else-if="deleteConfirmId === v.id">
                <span class="delete-confirm">
                  <span class="confirm-text">Delete?</span>
                  <button type="button" class="confirm-yes" @click="confirmDelete(v.id)">Yes</button>
                  <button type="button" class="confirm-no" @click="cancelDelete">No</button>
                </span>
              </template>
            </div>
            <!-- Inline color edit -->
            <div v-if="editingVariantId === v.id" class="mini-edit" @click.stop>
              <input v-model="editColor.name" class="mini-edit-input" placeholder="Color name" />
              <div class="mini-edit-row">
                <input type="color" v-model="editColor.hex" class="mini-swatch" />
                <input v-model="editColor.hex" class="mini-edit-input" placeholder="#000000" />
              </div>
              <div class="mini-edit-actions">
                <button type="button" class="action-link save-link" @click="saveEdit">Save</button>
                <span class="action-sep">|</span>
                <button type="button" class="action-link cancel-link" @click="cancelEdit">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid">
          <!-- Identity -->
          <div class="field span2">
            <label for="f-name">Name *</label>
            <input id="f-name" v-model="shared.name" class="input" placeholder="Galaxy Black" />
          </div>
          <div class="field">
            <label for="f-maker">Manufacturer</label>
            <input id="f-maker" v-model="shared.manufacturer" class="input" placeholder="Prusament" />
          </div>
          <div class="field">
            <label for="f-type">Material *</label>
            <select id="f-type" v-model="shared.type" class="input">
              <option v-for="m in MATERIALS" :key="m.key" :value="m.key">{{ m.label }}</option>
            </select>
          </div>

          <!-- Color (initial creation only: no variants yet) -->
          <template v-if="variants.length === 0 && !isEditing">
            <div class="field">
              <label for="f-colorname">Color name</label>
              <input id="f-colorname" v-model="initColor.name" class="input" placeholder="Galaxy Black" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <input type="color" v-model="initColorPicker" class="swatch" aria-label="Pick color" />
            </div>
            <div class="field">
              <label for="f-hex">Color *</label>
              <input id="f-hex" v-model="initColor.hex" class="input" :class="{ bad: !hexValid }" placeholder="#1b1b2a" />
            </div>
          </template>

          <!-- Temperatures -->
          <div class="field span2">
            <label>Nozzle °C (min / max)</label>
            <div class="row">
              <input v-model.number="shared.temps.nozzleMin" class="input" type="number" inputmode="numeric" />
              <input v-model.number="shared.temps.nozzleMax" class="input" type="number" inputmode="numeric" />
            </div>
          </div>
          <div class="field span2">
            <label>Bed °C (min / max)</label>
            <div class="row">
              <input v-model.number="shared.temps.bedMin" class="input" type="number" inputmode="numeric" />
              <input v-model.number="shared.temps.bedMax" class="input" type="number" inputmode="numeric" />
            </div>
          </div>

          <!-- Dimensions -->
          <div class="field span2">
            <label for="f-dia">Diameter (mm)</label>
            <select id="f-dia" v-model.number="shared.diameter" class="input">
              <option v-for="d in DIAMETERS" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="field span2">
            <label for="f-weight">Weight (g)</label>
            <input id="f-weight" v-model.number="shared.weightGrams" class="input" type="number" list="weight-list" min="0" />
            <datalist id="weight-list">
              <option v-for="w in WEIGHTS" :key="w" :value="w" />
            </datalist>
          </div>

          <!-- Purchase (explicit row to avoid auto-flow collision with dimensions) -->
          <div class="field purchase-price">
            <label for="f-price">Price</label>
            <input id="f-price" v-model.number="shared.purchase!.price" class="input" type="number" step="0.01" min="0" placeholder="29.99" />
          </div>
          <div class="field purchase-vendor">
            <label for="f-vendor">Bought from</label>
            <input id="f-vendor" v-model="shared.purchase!.vendor" class="input" placeholder="Prusa, Amazon…" />
          </div>
          <div class="field purchase-date">
            <label for="f-date">Purchase date</label>
            <input id="f-date" v-model="shared.purchase!.date" class="input" type="date" />
          </div>
          <div class="field span4">
            <label for="f-storage">Storage</label>
            <input id="f-storage" v-model="shared.storage" class="input" placeholder="Drybox A, shelf 2…" />
          </div>

          <!-- Notes -->
          <div class="field span4">
            <label for="f-notes">Notes</label>
            <textarea id="f-notes" v-model="shared.notes" class="input" rows="2" placeholder="Prints clean, low stringing…"></textarea>
          </div>
        </div>
      </div>

      <footer class="form-foot">
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn btn-brass" :disabled="!valid">Save spool</button>
      </footer>
    </form>
  </div>

  <AddColorModal v-if="addColorOpen" @add="onAddColor" @close="addColorOpen = false" />
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

/* Gallery / preview area */
.preview {
  flex: none;
  width: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding-top: 0.3rem;
  max-height: 420px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.add-color-btn {
  font-size: 0.62rem;
  padding: 0.3rem 0.5rem;
  width: 100%;
  text-align: center;
  flex: none;
}
.gallery-empty {
  padding: 1rem 0;
  text-align: center;
}
.empty-text {
  font-size: 0.72rem;
  color: #6b5631;
  letter-spacing: 0.05em;
}
.gallery-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.3rem;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.15s;
  flex: none;
}
.gallery-item:hover {
  border-color: var(--color-kraft-line);
}
.gallery-item.selected {
  border-color: var(--color-brass);
  background: rgba(215, 169, 78, 0.08);
}
.mini-reel {
  transform: scale(0.8);
  transform-origin: center top;
  width: 100px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: visible;
}
.mini-count-tag {
  transform: rotate(-1.5deg);
  transform-origin: center;
  display: flex;
  align-items: center;
  padding: 0.2rem 0.4rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.06)),
    var(--color-kraft);
  color: #2a2012;
  border: 1px solid var(--color-kraft-line);
  border-radius: 3px;
  box-shadow: 0 3px 6px -3px rgba(0, 0, 0, 0.5);
  font-family: var(--font-mono);
}
.mini-count-select {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.3rem;
  border: 1px solid var(--color-kraft-line);
  border-radius: 2px;
  background: #fffdf6;
  color: #2a2012;
  cursor: pointer;
}
.mini-actions {
  min-height: 1.2em;
}
.action-link {
  background: none;
  border: none;
  font-size: 0.62rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-family: var(--font-mono);
}
.action-sep {
  font-size: 0.62rem;
  color: #9a8a6e;
  margin: 0 0.15rem;
}
.edit-link {
  color: #4a6fa5;
}
.delete-link {
  color: #9a3b1f;
}
.save-link {
  color: #3a7a3a;
}
.cancel-link {
  color: #6b5631;
}
.mini-edit {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  padding-top: 0.2rem;
}
.mini-edit-input {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  padding: 0.2rem 0.3rem;
  border: 1px solid var(--color-kraft-line);
  border-radius: 2px;
  background: #fffdf6;
  color: #2a2012;
  width: 100%;
  box-sizing: border-box;
}
.mini-edit-row {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.mini-swatch {
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--color-kraft-line);
  border-radius: 2px;
  cursor: pointer;
  flex: none;
}
.mini-edit-actions {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 0.1rem;
}
.delete-confirm {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.62rem;
  font-family: var(--font-mono);
}
.confirm-text {
  color: #5b4a2c;
}
.confirm-yes {
  background: none;
  border: none;
  color: #9a3b1f;
  cursor: pointer;
  padding: 0;
  font-weight: 600;
  font-size: 0.62rem;
  font-family: var(--font-mono);
}
.confirm-no {
  background: none;
  border: none;
  color: #6b5631;
  cursor: pointer;
  padding: 0;
  font-size: 0.62rem;
  font-family: var(--font-mono);
}

/* Form grid */
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


/* Footer */
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

/* Purchase row hidden by default (same as original) */
.purchase-price,
.purchase-vendor,
.purchase-date {
  display: none;
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
