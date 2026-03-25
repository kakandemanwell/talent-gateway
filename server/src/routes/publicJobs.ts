import type { FastifyPluginAsync } from "fastify";
import sql from "../db.js";

interface JobRow {
  id: string;
  odoo_job_id: string;
  title: string;
  department: string | null;
  location: string | null;
  closing_date: string | null;
  description: string | null;
  skills: { name: string; type: string | null }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface QuestionRow {
  id: string;
  sequence: number;
  text: string;
  type: string;
  required: boolean;
  char_limit: number | null;
}

interface QuestionOptionRow {
  id: string;
  question_id: string;
  sequence: number;
  label: string;
}

const publicJobsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── GET /api/jobs ─────────────────────────────────────────────────────────
  // Returns all active, non-expired jobs for the public portal.
  // Mirrors the Supabase RLS policy: is_active = true AND closing_date >= today (or null).
  fastify.get("/jobs", async (_request, reply) => {
    const jobs = await sql<JobRow[]>`
      SELECT id, odoo_job_id, title, department, location,
             closing_date, description, skills, is_active, created_at, updated_at
      FROM jobs
      WHERE is_active = true
        AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)
      ORDER BY created_at DESC
    `;
    reply.send(jobs);
  });

  // ── GET /api/jobs/:id ─────────────────────────────────────────────────────
  // Returns a single active job by its UUID, including skills and questions.
  fastify.get<{ Params: { id: string } }>(
    "/jobs/:id",
    async (request, reply) => {
      const { id } = request.params;

      const rows = await sql<JobRow[]>`
        SELECT id, odoo_job_id, title, department, location,
               closing_date, description, skills, is_active, created_at, updated_at
        FROM jobs
        WHERE id = ${id}
          AND is_active = true
        LIMIT 1
      `;

      if (rows.length === 0) {
        return reply.status(404).send({ error: "Job not found" });
      }

      const job = rows[0];

      // Fetch questions for this job
      const questions = await sql<QuestionRow[]>`
        SELECT id, sequence, text, type, required, char_limit
        FROM job_questions
        WHERE job_id = ${id}
        ORDER BY sequence
      `;

      // Fetch options for all questions in one query
      const questionIds = questions.map((q) => q.id);
      const options =
        questionIds.length > 0
          ? await sql<QuestionOptionRow[]>`
              SELECT id, question_id, sequence, label
              FROM job_question_options
              WHERE question_id = ANY(${questionIds})
              ORDER BY sequence
            `
          : ([] as QuestionOptionRow[]);

      // Group options by question
      const optsByQuestion = new Map<string, QuestionOptionRow[]>();
      for (const opt of options) {
        const list = optsByQuestion.get(opt.question_id) ?? [];
        list.push(opt);
        optsByQuestion.set(opt.question_id, list);
      }

      const questionsWithOptions = questions.map((q) => ({
        id: q.id,
        sequence: q.sequence,
        text: q.text,
        type: q.type,
        required: q.required,
        char_limit: q.char_limit,
        options: optsByQuestion.get(q.id) ?? [],
      }));

      reply.send({ ...job, questions: questionsWithOptions });
    }
  );
};

export default publicJobsRoutes;
