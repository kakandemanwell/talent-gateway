import { supabase } from "@/lib/supabase";

export interface Job {
  id: string;          // Supabase UUID
  odoo_job_id: string; // "OD-{hr.job.id}"
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
 * Matches the RLS policy: is_active = true AND closing_date >= today (or null).
 */
export async function fetchActiveJobs(): Promise<Job[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, odoo_job_id, title, department, location, closing_date, description, is_active, created_at, updated_at"
    )
    .eq("is_active", true)
    .or(`closing_date.is.null,closing_date.gte.${today}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch a single job by its Supabase UUID.
 */
export async function fetchJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, odoo_job_id, title, department, location, closing_date, description, is_active, created_at, updated_at"
    )
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`Failed to fetch job: ${error.message}`);
  }

  return data;
}
