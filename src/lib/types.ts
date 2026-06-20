// Shared domain types for the filament inventory.
// The whole inventory is stored as ONE JSON document under a single Redis key.

export interface SpoolColor {
  /** Human label, e.g. "Galaxy Black". */
  name: string;
  /** Hex string incl. leading '#', e.g. "#1b1b2a". Drives ROYGBIV ordering. */
  hex: string;
}

export interface SpoolTemps {
  nozzleMin: number;
  nozzleMax: number;
  bed: number;
}

export interface SpoolPurchase {
  vendor?: string;
  /** ISO date, yyyy-mm-dd. */
  date?: string;
  price?: number;
  currency?: string;
}

export interface Spool {
  id: string;
  name: string;
  manufacturer: string;
  /** Material key (e.g. "PLA"); decides which shelf the reel sits on. */
  type: string;
  color: SpoolColor;
  temps: SpoolTemps;
  /** How many sealed spools of this exact SKU you own. */
  count: number;
  /** Filament diameter in mm: 1.75 or 2.85. */
  diameter: number;
  /** Net filament weight per spool, grams. */
  weightGrams: number;
  purchase?: SpoolPurchase;
  storage?: string;
  notes?: string;
}

export interface Inventory {
  version: number;
  /** ISO timestamp of the last write; used for optimistic concurrency. */
  updatedAt: string;
  spools: Spool[];
}

export const INVENTORY_VERSION = 1;

export function emptyInventory(): Inventory {
  return { version: INVENTORY_VERSION, updatedAt: '', spools: [] };
}
