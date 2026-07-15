/**
 * Helpers for building PostgREST filter strings safely from user input.
 *
 * `.or("col.ilike.%value%,...")` interpolates the value straight into a
 * PostgREST filter grammar where `,`, `(`, `)` are separators and `%`/`\` are
 * pattern metacharacters. A raw search string containing any of these could
 * change the query's meaning, so we neutralise them before interpolation.
 */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[%,()\\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Parse a 1-based `?page=` param into a safe positive integer (default 1). */
export function parsePage(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** First value of a possibly-array search param, trimmed. */
export function firstParam(raw: string | string[] | undefined): string {
  return (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
}
