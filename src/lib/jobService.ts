import { API_BASE } from "@/lib/api";

export interface Job {
  id: string;           // PostgreSQL UUID
  odoo_job_id: string;  // "OD-{hr.job.id}"
  title: string;
  department: string | null;
  location: string | null;
  closing_date: string | null; // ISO date string "YYYY-MM-DD"
  description: string | null;  // raw HTML from Odoo
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all currently active, non-expired jobs for the public portal.
 * The API applies: is_active = true AND closing_date >= today (or null).
 */
export async function fetchActiveJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) {
    throw new Error(`Failed to fetch jobs: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<Job[]>;
}

/**
 * Fetch a single active job by its UUID.
 */
export async function fetchJobById(id: string): Promise<Job | null> {
  const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch job: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<Job>;
}
