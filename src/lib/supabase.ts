import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_API_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_API_TOKEN in your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/** Name of the storage bucket for application files (CVs, accolades). */
export const FILES_BUCKET = "application-files";
