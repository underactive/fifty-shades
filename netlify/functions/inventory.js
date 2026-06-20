// netlify/functions/inventory.js
//
// Single endpoint for the filament inventory, stored as one JSON document in
// Upstash Redis. Mirrors the v1 handler + raw-fetch Upstash style used in
// esison.dev-astro/netlify/functions/reveal_contact.js.
//
//   GET  /api/inventory                 -> public read of the whole document
//   PUT  /api/inventory  (x-edit-pin)   -> PIN-gated overwrite of the document

import { createHash, timingSafeEqual } from 'node:crypto';

const KEY = 'filament:inventory:v1';
const INVENTORY_VERSION = 1;
const MAX_SPOOLS = 2000;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(statusCode, payload, extraHeaders) {
  return {
    statusCode,
    headers: { ...JSON_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

/** Constant-time, length-independent comparison via fixed-size hashes. */
function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

/** POST a command array to the Upstash REST API and return its `result`. */
async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('upstash-not-configured');

  const base = url.replace(/\/+$/, '');
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  }).then((r) => r.json());

  if (res && res.error) throw new Error(`upstash: ${res.error}`);
  return res ? res.result : null;
}

function emptyInventory() {
  return { version: INVENTORY_VERSION, updatedAt: '', spools: [] };
}

async function readInventory() {
  const raw = await redisCommand(['GET', KEY]);
  if (raw == null) return emptyInventory();
  try {
    // Upstash returns the stored string; it may already be an object on some paths.
    const doc = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!doc || !Array.isArray(doc.spools)) return emptyInventory();
    return doc;
  } catch {
    return emptyInventory();
  }
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function str(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate + normalize an incoming inventory document. Returns
 * { doc } on success or { error } with a human-readable reason.
 */
function sanitizeInventory(input) {
  if (!input || typeof input !== 'object') return { error: 'body must be an object' };
  if (!Array.isArray(input.spools)) return { error: 'spools must be an array' };
  if (input.spools.length > MAX_SPOOLS) return { error: `too many spools (max ${MAX_SPOOLS})` };

  const spools = [];
  for (let i = 0; i < input.spools.length; i++) {
    const s = input.spools[i];
    if (!s || typeof s !== 'object') return { error: `spool ${i} is not an object` };

    const hex = str(s.color && s.color.hex, 9);
    if (!HEX_RE.test(hex)) return { error: `spool ${i} has an invalid color hex` };

    const name = str(s.name, 120).trim();
    if (!name) return { error: `spool ${i} is missing a name` };

    const type = str(s.type, 40).trim();
    if (!type) return { error: `spool ${i} is missing a material type` };

    const count = num(s.count);
    if (count == null || count < 0) return { error: `spool ${i} has an invalid count` };

    const nozzleMin = num(s.temps && s.temps.nozzleMin) ?? 0;
    const nozzleMax = num(s.temps && s.temps.nozzleMax) ?? 0;
    const bed = num(s.temps && s.temps.bed) ?? 0;

    const purchase = s.purchase && typeof s.purchase === 'object' ? s.purchase : undefined;

    spools.push({
      id: str(s.id, 64) || `${Date.now().toString(36)}-${i}`,
      name,
      manufacturer: str(s.manufacturer, 120).trim(),
      type,
      color: { name: str(s.color && s.color.name, 80).trim(), hex: hex.toLowerCase() },
      temps: {
        nozzleMin: Math.round(nozzleMin),
        nozzleMax: Math.round(nozzleMax),
        bed: Math.round(bed),
      },
      count: Math.round(count),
      diameter: num(s.diameter) ?? 1.75,
      weightGrams: num(s.weightGrams) ?? 1000,
      ...(purchase
        ? {
            purchase: {
              vendor: str(purchase.vendor, 120).trim(),
              date: str(purchase.date, 10),
              price: num(purchase.price) ?? undefined,
              currency: str(purchase.currency, 8).trim() || 'USD',
            },
          }
        : {}),
      ...(s.storage ? { storage: str(s.storage, 120).trim() } : {}),
      ...(s.notes ? { notes: str(s.notes, 2000) } : {}),
    });
  }

  return {
    doc: { version: INVENTORY_VERSION, updatedAt: new Date().toISOString(), spools },
  };
}

export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const doc = await readInventory();
      return json(200, doc);
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      const expected = process.env.EDIT_PIN;
      if (!expected) {
        // Fail closed: no PIN configured means editing is disabled entirely.
        return json(503, { error: 'edit-disabled', message: 'EDIT_PIN is not configured' });
      }

      const provided = (event.headers['x-edit-pin'] || event.headers['X-Edit-Pin'] || '').trim();
      if (!provided || !safeEqual(provided, expected)) {
        return json(401, { error: 'unauthorized' });
      }

      let parsed;
      try {
        parsed = JSON.parse(event.body || '{}');
      } catch {
        return json(400, { error: 'invalid-json' });
      }

      const result = sanitizeInventory(parsed);
      if (result.error) return json(400, { error: 'invalid-payload', message: result.error });

      await redisCommand(['SET', KEY, JSON.stringify(result.doc)]);
      return json(200, result.doc);
    }

    return json(405, { error: 'method-not-allowed' }, { Allow: 'GET, PUT' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    if (message === 'upstash-not-configured') {
      return json(500, { error: 'storage-not-configured' });
    }
    console.error(JSON.stringify({ event: 'inventory_error', message }));
    return json(500, { error: 'server-error' });
  }
}
