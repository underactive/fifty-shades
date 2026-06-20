// Tiny client for the /api/inventory function.
import type { Inventory, Spool } from './types';

const ENDPOINT = '/api/inventory';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function getInventory(): Promise<Inventory> {
  const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new ApiError(`Could not load inventory (${res.status})`, res.status);
  return res.json();
}

/** PUT the full spool list. `pin` is sent in a header, never persisted to disk. */
export async function saveInventory(spools: Spool[], pin: string): Promise<Inventory> {
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-edit-pin': pin },
    body: JSON.stringify({ spools }),
  });
  if (res.ok) return res.json();

  let message = `Save failed (${res.status})`;
  try {
    const body = await res.json();
    message = body.message || body.error || message;
  } catch {
    /* keep default */
  }
  throw new ApiError(message, res.status);
}
