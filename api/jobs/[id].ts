import sql from "../_lib/db.js";
import { corsHeaders, handleOptions } from "../_lib/helpers.js";

export const config = { runtime: 'edge' };

/**
 * GET /api/jobs/:id
 *
 * Returns a single active job by UUID, including its questions and options.
 * Vercel injects the dynamic segment as req.query.id via VercelRequest, but
 * in Web API mode we parse it from the URL.
 */
export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(request) });
  }

  // Extract the [id] segment from the URL path: /api/jobs/<id>
  const url = new URL(request.url);
  const segments = url.pathname.replace(/\/$/, "").split("/");
  const id = segments[segments.length - 1];

  if (!id) {
    return Response.json({ error: "Job ID is required" }, { status: 400, headers: corsHeaders(request) });
  }

  try {
    const rows = await sql`
      SELECT id, odoo_job_id, title, department, location,
             closing_date, description, skills, is_active, created_at, updated_at
      FROM jobs
      WHERE id = ${id}
        AND is_active = true
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ error: "Job not found" }, { status: 404, headers: corsHeaders(request) });
    }

    const job = rows[0];

    // Fetch questions for this job
    const questions = await sql<{ id: string; sequence: number; text: string; type: string; required: boolean; char_limit: number | null }>`
      SELECT id, sequence, text, type, required, char_limit
      FROM job_questions
      WHERE job_id = ${id}
      ORDER BY sequence
    `;

    // Fetch all options for those questions in one query
    const questionIds = questions.map((q) => q.id);
    const options =
      questionIds.length > 0
        ? await sql<{ id: string; question_id: string; sequence: number; label: string }>`
            SELECT id, question_id, sequence, label
            FROM job_question_options
            WHERE question_id = ANY(${questionIds})
            ORDER BY sequence
          `
        : [];

    // Group options by question_id
    const optsByQuestion = new Map<string, typeof options>();
    for (const opt of options) {
      const list = optsByQuestion.get(opt.question_id) ?? [];
      list.push(opt);
      optsByQuestion.set(opt.question_id, list);
    }

    const questionsWithOptions = questions.map((q: { id: string; sequence: number; text: string; type: string; required: boolean; char_limit: number | null }) => ({
      id: q.id,
      sequence: q.sequence,
      text: q.text,
      type: q.type,
      required: q.required,
      char_limit: q.char_limit,
      options: optsByQuestion.get(q.id) ?? [],
    }));

    return Response.json({ ...job, questions: questionsWithOptions }, { headers: corsHeaders(request) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders(request) });
  }
}
