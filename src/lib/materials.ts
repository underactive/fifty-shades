// Material presets: shelf order + default temperatures auto-filled in the form.
// Values are sensible starting points — every field stays editable per spool.

export interface MaterialPreset {
  key: string;
  label: string;
  nozzleMin: number;
  nozzleMax: number;
  bed: number;
  /** Short blurb shown on the shelf header. */
  blurb: string;
}

export const MATERIALS: MaterialPreset[] = [
  { key: 'PLA', label: 'PLA', nozzleMin: 195, nozzleMax: 220, bed: 60, blurb: 'easy · everyday' },
  { key: 'PETG', label: 'PETG', nozzleMin: 230, nozzleMax: 250, bed: 80, blurb: 'tough · glossy' },
  { key: 'ABS', label: 'ABS', nozzleMin: 230, nozzleMax: 250, bed: 100, blurb: 'heat · enclosure' },
  { key: 'ASA', label: 'ASA', nozzleMin: 240, nozzleMax: 260, bed: 100, blurb: 'uv-stable · outdoor' },
  { key: 'TPU', label: 'TPU', nozzleMin: 210, nozzleMax: 230, bed: 50, blurb: 'flexible · slow' },
  { key: 'Nylon', label: 'Nylon', nozzleMin: 240, nozzleMax: 270, bed: 80, blurb: 'strong · hygroscopic' },
  { key: 'PC', label: 'PC', nozzleMin: 260, nozzleMax: 290, bed: 110, blurb: 'rigid · high-temp' },
  { key: 'PVA', label: 'PVA', nozzleMin: 185, nozzleMax: 215, bed: 60, blurb: 'support · dissolves' },
  { key: 'HIPS', label: 'HIPS', nozzleMin: 230, nozzleMax: 245, bed: 100, blurb: 'support · limonene' },
];

const MATERIAL_INDEX = new Map(MATERIALS.map((m, i) => [m.key, i]));

/** Lookup a preset by key (case-insensitive); undefined for custom types. */
export function materialPreset(key: string): MaterialPreset | undefined {
  return MATERIALS.find((m) => m.key.toLowerCase() === key.toLowerCase());
}

/**
 * Shelf ordering: known materials in MATERIALS order, then any custom types
 * alphabetically after them.
 */
export function shelfRank(type: string): number {
  const idx = MATERIAL_INDEX.get(type);
  return idx === undefined ? MATERIALS.length : idx;
}

export const DIAMETERS = [1.75, 2.85];
export const WEIGHTS = [250, 500, 750, 1000, 2000, 5000];
