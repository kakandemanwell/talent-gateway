import sql from "../_lib/db.js";
import { bearerAuth } from "../_lib/auth.js";

export const config = { runtime: 'edge' };

interface PushJobSkill {
  name: string;
  type?: string | null;
}

interface PushJobQuestionOption {
  id: string;
  label: string;
  sequence?: number;
}

interface PushJobQuestion {
  id: string;
  text: string;
  type: string;
  required?: boolean;
  char_limit?: number | null;
  sequence?: number;
  options?: PushJobQuestionOption[];
}

interface PushJobBody {
  job_id?: unknown;
  title?: unknown;
  department?: unknown;
  location?: unknown;
  closing_date?: unknown;
  description?: unknown;
  is_active?: unknown;
  skills?: unknown;
  questions?: unknown;
}

/**
 * POST /functions/v1/odoo-push-job
 *
 * Called by Odoo on hr.job create / write / archive.
 * Upserts the job record keyed on odoo_job_id.
 * Skills and questions are fully replaced on every push.
 */
export default async function handler(request: Request): Promise<Response> {
  const authErr = bearerAuth(request);
  if (authErr) return authErr;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: PushJobBody;
  try {
    body = (await request.json()) as PushJobBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.job_id || typeof body.job_id !== "string") {
    return Response.json({ error: "job_id is required and must be a string" }, { status: 422 });
  }
  if (!body.title || typeof body.title !== "string") {
    return Response.json({ error: "title is required and must be a string" }, { status: 422 });
  }

  const department   = typeof body.department   === "string" ? body.department   : null;
  const location     = typeof body.location     === "string" ? body.location     : null;
  const closing_date = typeof body.closing_date === "string" ? body.closing_date : null;
  const description  = typeof body.description  === "string" ? body.description  : null;
  const is_active    = typeof body.is_active    === "boolean" ? body.is_active   : true;

  const rawSkills = Array.isArray(body.skills) ? (body.skills as PushJobSkill[]) : [];
  const skills: PushJobSkill[] = rawSkills.map((s) => ({
    name: typeof s.name === "string" ? s.name : String(s.name ?? ""),
    type: typeof s.type === "string" ? s.type : null,
  }));

  const rawQuestions = Array.isArray(body.questions) ? (body.questions as PushJobQuestion[]) : [];

  try {
    // ── 1. Upsert job row ──────────────────────────────────────────────────
    const rows = await sql`
      INSERT INTO jobs (odoo_job_id, title, department, location, closing_date, description, skills, is_active, updated_at)
      VALUES (
        ${body.job_id}, ${body.title}, ${department}, ${location},
        ${closing_date}, ${description}, ${JSON.stringify(skills)}, ${is_active}, now()
      )
      ON CONFLICT (odoo_job_id) DO UPDATE SET
        title        = EXCLUDED.title,
        department   = EXCLUDED.department,
        location     = EXCLUDED.location,
        closing_date = EXCLUDED.closing_date,
        description  = EXCLUDED.description,
        skills       = EXCLUDED.skills::jsonb,
        is_active    = EXCLUDED.is_active,
        updated_at   = now()
      RETURNING id, odoo_job_id
    `;
    const row = rows[0] as { id: string; odoo_job_id: string };

    // ── 2. Replace questions: delete old, insert new ───────────────────────
    await sql`DELETE FROM job_questions WHERE job_id = ${row.id}`;

    if (rawQuestions.length > 0) {
      for (const q of rawQuestions.map((q, idx) => ({
        id: q.id,
        job_id: row.id,
        sequence: typeof q.sequence === "number" ? q.sequence : rawQuestions.indexOf(q),
        text: q.text,
        type: q.type,
        required: q.required === true,
        char_limit: typeof q.char_limit === "number" ? q.char_limit : null,
      }))) {
        await sql`
          INSERT INTO job_questions (id, job_id, sequence, text, type, required, char_limit)
          VALUES (${q.id}, ${q.job_id}, ${q.sequence}, ${q.text}, ${q.type}, ${q.required}, ${q.char_limit})
        `;
      }

      const allOptions = rawQuestions.flatMap((q) =>
        (q.options ?? []).map((opt, optIdx) => ({
          id: opt.id,
          question_id: q.id,
          sequence: typeof opt.sequence === "number" ? opt.sequence : optIdx,
          label: opt.label,
        }))
      );
      for (const opt of allOptions) {
        await sql`
          INSERT INTO job_question_options (id, question_id, sequence, label)
          VALUES (${opt.id}, ${opt.question_id}, ${opt.sequence}, ${opt.label})
        `;
      }
    }

    return Response.json({ success: true, id: row.id, odoo_job_id: row.odoo_job_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
