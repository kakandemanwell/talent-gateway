import { upload } from "@vercel/blob/client";
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

/**
 * Submit a complete job application.
 *
 * Upload flow (Vercel Blob):
 *   1. Upload the CV directly to Vercel Blob via the client SDK.
 *      The browser streams the file to Vercel's CDN; no file bytes hit the
 *      serverless function.
 *   2. Upload each accolade file the same way.
 *   3. POST a JSON body containing the blob URLs and all structured data
 *      to POST /api/applications.
 */
export async function submitApplication(
  payload: ApplicationPayload
): Promise<{ applicationId: string }> {

  // ── Step 1: Upload CV ────────────────────────────────────────────────────
  const cvBlob = await upload(
    `applications/cv/${Date.now()}_${payload.cv.name}`,
    payload.cv,
    { access: "public", handleUploadUrl: `${API_BASE}/blob/upload-url` }
  );

  // ── Step 2: Upload accolades ─────────────────────────────────────────────
  const educationWithUrls = await Promise.all(
    payload.education.map(async (edu) => {
      let accolade_url: string | null = null;
      if (edu.accolade) {
        const rand = Math.random().toString(36).slice(2, 7);
        const accoBlob = await upload(
          `applications/accolades/${Date.now()}_${rand}_${edu.accolade.name}`,
          edu.accolade,
          { access: "public", handleUploadUrl: `${API_BASE}/blob/upload-url` }
        );
        accolade_url = accoBlob.url;
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
      cv_url:           cvBlob.url,
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
