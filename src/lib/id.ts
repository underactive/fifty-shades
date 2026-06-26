/** Generate a unique ID. Uses crypto.randomUUID when available, falls back to random string. */
export function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
