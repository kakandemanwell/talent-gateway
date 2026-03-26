/**
 * Bearer token authentication helper for Odoo-facing routes.
 *
 * Validates the Authorization: Bearer <token> header against the
 * ODOO_API_KEY environment variable.  Returns an error Response when
 * auth fails, or null when the request is authorised.
 */
export function bearerAuth(request: Request): Response | null {
  const expectedKey = process.env.ODOO_API_KEY;
  if (!expectedKey) {
    console.error("[auth] ODOO_API_KEY environment variable is not set");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  // request.headers may be a Web API Headers instance (.get) or a plain
  // Node.js IncomingMessage headers object (bracket access) depending on
  // the Vercel runtime version.
  const hdrs = request.headers as unknown as Record<string, string> & { get?: (n: string) => string | null };
  const authHeader = (typeof hdrs.get === "function" ? hdrs.get("authorization") : hdrs["authorization"]) ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token !== expectedKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null; // authorised
}
