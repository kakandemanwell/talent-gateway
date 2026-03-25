import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Fastify preHandler hook — validates the Bearer token on Odoo-facing routes.
 * Identical logic to the validateBearer() helper in every Supabase edge function.
 */
export async function bearerAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const expectedKey = process.env.ODOO_API_KEY;
  if (!expectedKey) {
    console.error("[auth] ODOO_API_KEY environment variable is not set");
    reply.status(500).send({ error: "Server misconfiguration" });
    return;
  }
  const authHeader = request.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token !== expectedKey) {
    reply.status(401).send({ error: "Unauthorized" });
  }
}
