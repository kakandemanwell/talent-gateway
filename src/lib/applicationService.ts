import { put } from "@vercel/blob/client";
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

export interface QuestionAnswerPayload {
  question_id: string;
  type: "text" | "radio" | "checkbox" | "dropdown";
  answer?: string;    // for text, radio, dropdown
  answers?: string[]; // for checkbox (array of OD-OPT-{n} ids)
}

export interface ApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  cv: File;
  experience: ExperiencePayload[];
  education: EducationPayload[];
  questionAnswers: QuestionAnswerPayload[];
  /** UUID of the jobs row this application is for. */
  jobId: string;
}

/* ------------------------------------------------------------------ */
/*  Main submission function                                          */
/* ------------------------------------------------------------------ */

/** Get a short-lived client token then upload a file directly to the CDN. */
async function uploadToBlob(pathname: string, file: File): Promise<string> {
  const res = await fetch(`${API_BASE}/blob/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathname, contentType: file.type }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Failed to get upload token: ${res.status}`);
  }
  const { clientToken } = await res.json() as { clientToken: string };
  const blob = await put(pathname, file, { access: "public", token: clientToken });
  return blob.url;
}

/**
 * Submit a complete job application.
 *
 * Upload flow (Vercel Blob):
 *   1. POST { pathname, contentType } to /api/blob/upload-url to get a
 *      short-lived client token from the server.
 *   2. Use put() to stream the file directly to Vercel Blob CDN using
 *      that token — no callback mechanism, no server round-trip for bytes.
 *   3. POST a JSON body with the resulting blob URLs to /api/applications.
 */
export async function submitApplication(
  payload: ApplicationPayload
): Promise<{ applicationId: string }> {

  /** Strip characters that can confuse URL parsers in blob pathnames. */
  const safeName = (name: string) =>
    name.replace(/[^a-zA-Z0-9._\-]/g, "_").replace(/__+/g, "_").slice(0, 200);

  // ── Step 1: Upload CV ────────────────────────────────────────────────────
  const cvUrl = await uploadToBlob(
    `applications/cv/${Date.now()}_${safeName(payload.cv.name)}`,
    payload.cv,
  );

  // ── Step 2: Upload accolades ─────────────────────────────────────────────
  const educationWithUrls = await Promise.all(
    payload.education.map(async (edu) => {
      let accolade_url: string | null = null;
      if (edu.accolade) {
        const rand = Math.random().toString(36).slice(2, 7);
        accolade_url = await uploadToBlob(
          `applications/accolades/${Date.now()}_${rand}_${safeName(edu.accolade.name)}`,
          edu.accolade,
        );
      }
      return {
        qualification: edu.qualification,
        level:         edu.level,
        field:         edu.field,
        institution:   edu.institution,
        yearCompleted: edu.yearCompleted,
        accolade_url,
      };
    })
  );

  // ── Step 3: POST structured JSON (no files) ──────────────────────────────
  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name:        payload.fullName,
      email:            payload.email,
      phone:            payload.phone,
      summary:          payload.summary,
      job_id:           payload.jobId,
      cv_url:           cvUrl,
      experience:       payload.experience,
      education:        educationWithUrls,
      question_answers: payload.questionAnswers,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Submission failed: ${res.status} ${res.statusText}`);
  }

  const { applicationId } = await res.json() as { applicationId: string };
  return { applicationId };
}
