import { API_BASE } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types matching the form state in Index.tsx                        */
/* ------------------------------------------------------------------ */

export interface ExperiencePayload {
  position: string;
  description: string;
  employer: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  years: string;
}

export interface EducationPayload {
  qualification: string;
  level: string;
  field: string;
  institution: string;
  yearCompleted: string;
  accolade: File | null;
}

export interface ApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  cv: File;
  experience: ExperiencePayload[];
  education: EducationPayload[];
  /** UUID of the jobs row this application is for. */
  jobId: string;
}

/* ------------------------------------------------------------------ */
/*  Main submission function                                          */
/* ------------------------------------------------------------------ */

/**
 * Submit a complete job application to the API.
 *
 * Sends a single multipart/form-data POST to POST /api/applications.
 * The API handles all DB inserts and file uploads to MinIO atomically.
 * File fields: cv (required), accolade_0 … accolade_N (optional per education row).
 */
export async function submitApplication(
  payload: ApplicationPayload
): Promise<{ applicationId: string }> {
  const form = new FormData();

  // ── Scalar fields ────────────────────────────────────────────────
  form.append("full_name", payload.fullName);
  form.append("email",     payload.email);
  form.append("phone",     payload.phone);
  form.append("summary",   payload.summary);
  form.append("job_id",    payload.jobId);

  // ── Structured arrays as JSON ────────────────────────────────────
  // Strip the File object from education before JSON-encoding;
  // accolade files are sent as separate named file fields.
  const educationMeta = payload.education.map((edu) => ({
    qualification: edu.qualification,
    level:         edu.level,
    field:         edu.field,
    institution:   edu.institution,
    yearCompleted: edu.yearCompleted,
  }));
  form.append("experience", JSON.stringify(payload.experience));
  form.append("education",  JSON.stringify(educationMeta));

  // ── File fields ──────────────────────────────────────────────────
  form.append("cv", payload.cv);
  payload.education.forEach((edu, idx) => {
    if (edu.accolade) {
      form.append(`accolade_${idx}`, edu.accolade);
    }
  });

  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Submission failed: ${res.status} ${res.statusText}`);
  }

  const { applicationId } = await res.json() as { applicationId: string };
  return { applicationId };
}
