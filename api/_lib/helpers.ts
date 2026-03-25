/**
 * Shared CORS headers for public API routes.
 * The allowed origin is set via ALLOWED_ORIGIN env var; omit to block
 * cross-origin requests in production.
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = process.env.ALLOWED_ORIGIN ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}

/** Respond to CORS preflight. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function handleOptions(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  return null;
}

/**
 * Normalise education level strings to Odoo selection keys.
 * The form may send a human-readable label; we store the key so
 * odoo-get-applications passes it through unchanged.
 */
const LEVEL_KEY_MAP: Record<string, string> = {
  certificate:         "certificate",
  diploma:             "diploma",
  "higher diploma":    "higher_diploma",
  higher_diploma:      "higher_diploma",
  bachelor:            "bachelor",
  "bachelor's degree": "bachelor",
  honours:             "honours",
  "honours degree":    "honours",
  master:              "master",
  "master's degree":   "master",
  phd:                 "phd",
  "phd / doctorate":   "phd",
  doctorate:           "phd",
  other:               "other",
};

export function normaliseLevelKey(value: string): string {
  return LEVEL_KEY_MAP[value.toLowerCase().trim()] ?? value;
}

/**
 * Gap 1: Odoo fields.Date requires full ISO "YYYY-MM-DD".
 * The form stores month-picker values as "YYYY-MM" — pad to first of month.
 */
export function padToFullDate(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}
