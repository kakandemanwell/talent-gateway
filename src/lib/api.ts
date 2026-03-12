/**
 * Base URL for all API calls.
 * Points to the Fastify API service — set VITE_API_URL at build time.
 * Falls back to /api so the Nginx reverse proxy handles routing in production
 * without needing the full domain baked in.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
