import sql from "./_lib/db.js";
import { corsHeaders, handleOptions, normaliseLevelKey } from "./_lib/helpers.js";

export const config = { runtime: 'edge' };

/**
 * POST /api/applications
 *
 * Accepts a JSON body (not multipart).  Files are uploaded directly to
 * Vercel Blob by the browser before this call; this endpoint receives the
 * resulting blob URLs and stores them in the database.
 *
 * Body shape:
 * {
 *   full_name:        string,
 *   email:            string,
 *   phone:            string,
 *   summary?:         string,
 *   job_id:           string (UUID of the jobs row),
 *   cv_url:           string (Vercel Blob URL of the uploaded CV),
 *   experience:       ExperiencePayload[],
 *   education:        EducationPayload[],   // each may include accolade_url
 *   question_answers: QuestionAnswerPayload[]
 * }
 */

interface ExperiencePayload {
  position: string;
  description: string;
  employer: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  years: string;
}

interface EducationPayload {
  qualification: string;
  level: string;
  field: string;
  institution: string;
  yearCompleted: string;
  accolade_url?: string | null;
}

interface QuestionAnswerPayload {
  question_id: string;
  type: "text" | "radio" | "checkbox" | "dropdown";
  answer?: string;
  answers?: string[];
}

interface ApplicationBody {
  full_name?: unknown;
  email?: unknown;
  phone?: unknown;
  summary?: unknown;
  job_id?: unknown;
  cv_url?: unknown;
  experience?: unknown;
  education?: unknown;
  question_answers?: unknown;
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(request) });
  }

  let body: ApplicationBody;
  try {
    body = (await request.json()) as ApplicationBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders(request) });
  }

  // ── Validate required fields ──────────────────────────────────────────────
  const { full_name, email, phone, summary, job_id, cv_url } = body;
  if (!full_name || typeof full_name !== "string") {
    return Response.json({ error: "full_name is required" }, { status: 422, headers: corsHeaders(request) });
  }
  if (!email || typeof email !== "string") {
    return Response.json({ error: "email is required" }, { status: 422, headers: corsHeaders(request) });
  }
  if (!phone || typeof phone !== "string") {
    return Response.json({ error: "phone is required" }, { status: 422, headers: corsHeaders(request) });
  }
  if (!job_id || typeof job_id !== "string") {
    return Response.json({ error: "job_id is required" }, { status: 422, headers: corsHeaders(request) });
  }
  if (!cv_url || typeof cv_url !== "string") {
    return Response.json({ error: "cv_url (Vercel Blob URL of uploaded CV) is required" }, { status: 422, headers: corsHeaders(request) });
  }

  const experience: ExperiencePayload[] = Array.isArray(body.experience) ? body.experience as ExperiencePayload[] : [];
  const education: EducationPayload[] = Array.isArray(body.education) ? body.education as EducationPayload[] : [];
  const questionAnswers: QuestionAnswerPayload[] = Array.isArray(body.question_answers) ? body.question_answers as QuestionAnswerPayload[] : [];

  // ── Step 1: Insert application row ────────────────────────────────────────
  let applicationId: string;
  try {
    const rows = await sql`
      INSERT INTO applications (full_name, email, phone, summary, status, job_id, cv_file_path, gateway_sync_status)
      VALUES (${full_name}, ${email}, ${phone}, ${(summary as string) ?? null}, 'new', ${job_id}, ${cv_url}, 'new')
      RETURNING id
    `;
    applicationId = (rows[0] as { id: string }).id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Failed to create application: ${msg}` }, { status: 500, headers: corsHeaders(request) });
  }

  try {
    // ── Step 2: Insert experience rows ──────────────────────────────────────
    if (experience.length > 0) {
      for (const exp of experience) {
        await sql`
          INSERT INTO experience
            (application_id, position, description, employer, start_date, end_date, is_current, years)
          VALUES (
            ${applicationId}, ${exp.position}, ${exp.description || null},
            ${exp.employer}, ${exp.startDate},
            ${exp.isCurrent ? null : (exp.endDate || null)},
            ${exp.isCurrent},
            ${exp.years ? parseFloat(exp.years) : null}
          )
        `;
      }
    }

    // ── Step 3: Insert education rows (blob URLs already in payload) ─────────
    if (education.length > 0) {
      for (const edu of education) {
        await sql`
          INSERT INTO education
            (application_id, qualification, level, field_of_study, institution,
             year_completed, accolade_file_path)
          VALUES (
            ${applicationId},
            ${edu.qualification},
            ${normaliseLevelKey(edu.level)},
            ${edu.field},
            ${edu.institution},
            ${edu.yearCompleted ? parseInt(edu.yearCompleted, 10) : null},
            ${edu.accolade_url ?? null}
          )
        `;
      }
    }

    // ── Step 4: Insert question answers ─────────────────────────────────────
    if (questionAnswers.length > 0) {
      for (const qa of questionAnswers) {
        await sql`
          INSERT INTO application_question_answers
            (application_id, question_id, answer_text, answer_option_ids)
          VALUES (
            ${applicationId},
            ${qa.question_id},
            ${qa.type === "text" ? (qa.answer ?? null) : null},
            ${qa.type === "checkbox"
              ? (qa.answers ?? null)
              : qa.answer
              ? [qa.answer]
              : null}
          )
        `;
      }
    }

    return Response.json({ applicationId }, { status: 201, headers: corsHeaders(request) });
  } catch (err) {
    // Best-effort: mark the application record as failed so it can be cleaned up.
    await sql`
      UPDATE applications SET status = 'submission_failed' WHERE id = ${applicationId}
    `.catch(() => {});

    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Application submission failed: ${msg}` },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
