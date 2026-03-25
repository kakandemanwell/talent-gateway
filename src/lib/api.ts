/**
 * Base URL for all API calls.
 *
 * On Vercel the frontend and the serverless functions share the same domain,
 * so /api resolves correctly without any extra configuration.
 * Set VITE_API_URL only when you need to override (e.g. a local dev API server).
 */
export const API_BASE = import.meta.env.VITE_API_URL || "/api";
