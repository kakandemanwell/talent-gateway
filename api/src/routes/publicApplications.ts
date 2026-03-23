import type { FastifyPluginAsync } from "fastify";
import sql from "../db.js";
import { uploadFile } from "../storage.js";

// ── Education level normalisation (Gap 2 fix) ─────────────────────────────────
// The form may send a display label ("Bachelor's Degree") or the Odoo selection
// key ("bachelor"). We normalise to the key on insert so the DB always stores
// what Odoo expects, and odoo-get-applications can pass it through unchanged.
const LEVEL_KEY_MAP: Record<string, string> = {
  certificate:         "certificate",
  diploma:             "diploma",
  "higher diploma":    "higher_diploma",
  higher_diploma:      "higher_diploma",
  bachelor:            "bachelor",
  "bachelor's degree": "bachelor",
  honours:             "honours",
  "honours degree":    "honours",
  master:              "master",
  "master's degree":   "master",
  phd:                 "phd",
  "phd / doctorate":   "phd",
  doctorate:           "phd",
  other:               "other",
};

function normaliseLevelKey(value: string): string {
  return LEVEL_KEY_MAP[value.toLowerCase().trim()] ?? value;
}

// ── Types for parsed multipart payload ────────────────────────────────────────

interface ParsedFile {
  buffer: Buffer;
  mimetype: string;
  filename: string;
}

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
}

// ── Route ─────────────────────────────────────────────────────────────────────

const publicApplicationsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── POST /api/applications ────────────────────────────────────────────────
  // Accepts multipart/form-data.
  //
  // Text fields:
  //   full_name, email, phone, summary, job_id
  //   experience  — JSON array of ExperiencePayload
  //   education   — JSON array of EducationPayload (no accolade file objects)
  //
  // File fields:
  //   cv           — the applicant's CV (required)
  //   accolade_0   — accolade for education[0] (optional)
  //   accolade_1   — accolade for education[1] (optional)
  //   … and so on
  //
  // Replicates the 5-step transactional flow from the Supabase applicationService.ts.
  fastify.post("/applications", async (request, reply) => {
    // ── Parse multipart ────────────────────────────────────────────────────
    const fields: Record<string, string> = {};
    const files: Record<string, ParsedFile> = {};

    for await (const part of request.parts()) {
      if (part.type === "field") {
        fields[part.fieldname] = String(part.value);
      } else {
        // Buffer file in memory (CVs / accolades are typically < 10 MB)
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk as Buffer);
        }
        files[part.fieldname] = {
          buffer: Buffer.concat(chunks),
          mimetype: part.mimetype,
          filename: part.filename ?? part.fieldname,
        };
      }
    }

    // ── Validate required fields ───────────────────────────────────────────
    const { full_name, email, phone, summary, job_id } = fields;
    if (!full_name || !email || !phone || !job_id) {
      return reply
        .status(422)
        .send({ error: "full_name, email, phone, and job_id are required" });
    }
    if (!files["cv"]) {
      return reply.status(422).send({ error: "cv file is required" });
    }

    let experience: ExperiencePayload[] = [];
    let education: EducationPayload[] = [];
    try {
      if (fields["experience"]) experience = JSON.parse(fields["experience"]);
      if (fields["education"]) education = JSON.parse(fields["education"]);
    } catch {
      return reply
        .status(422)
        .send({ error: "experience and education must be valid JSON arrays" });
    }

    // ── Step 1: Insert application row ─────────────────────────────────────
    let applicationId: string;
    try {
      const rows = await sql<{ id: string }[]>`
        INSERT INTO applications (full_name, email, phone, summary, status, job_id, gateway_sync_status)
        VALUES (${full_name}, ${email}, ${phone}, ${summary ?? null}, 'new', ${job_id}, 'new')
        RETURNING id
      `;
      applicationId = rows[0].id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return reply
        .status(500)
        .send({ error: `Failed to create application: ${msg}` });
    }

    try {
      // ── Step 2: Upload CV to MinIO ───────────────────────────────────────
      const cvFile = files["cv"];
      const cvExt = cvFile.filename.split(".").pop() ?? "pdf";
      const cvPath = `${applicationId}/cv/${Date.now()}.${cvExt}`;
      const storedCvPath = await uploadFile(
        cvPath,
        cvFile.buffer,
        cvFile.mimetype,
        undefined,
        cvFile.filename  // preserved in object metadata for Content-Disposition
      );

      // ── Step 3: Update application with CV path ───────────────────────────
      await sql`
        UPDATE applications SET cv_file_path = ${storedCvPath} WHERE id = ${applicationId}
      `;

      // ── Step 4: Insert experience rows ────────────────────────────────────
      if (experience.length > 0) {
        const experienceRows = experience.map((exp) => ({
          application_id: applicationId,
          position:       exp.position,
          description:    exp.description || null,
          employer:       exp.employer,
          start_date:     exp.startDate,
          end_date:       exp.isCurrent ? null : (exp.endDate || null),
          is_current:     exp.isCurrent,
          years:          exp.years ? parseFloat(exp.years) : null,
        }));
        await sql`INSERT INTO experience ${sql(experienceRows)}`;
      }

      // ── Step 5: Upload accolades + insert education rows ──────────────────
      if (education.length > 0) {
        const educationRows = await Promise.all(
          education.map(async (edu, idx) => {
            let accoladeFilePath: string | null = null;
            const accoladeFile = files[`accolade_${idx}`];
            if (accoladeFile) {
              const ext = accoladeFile.filename.split(".").pop() ?? "pdf";
              const rand = Math.random().toString(36).slice(2, 7);
              const accoladePath = `${applicationId}/accolades/${Date.now()}_${rand}.${ext}`;
              accoladeFilePath = await uploadFile(
                accoladePath,
                accoladeFile.buffer,
                accoladeFile.mimetype,
                undefined,
                accoladeFile.filename  // preserved for Content-Disposition
              );
            }
            return {
              application_id:   applicationId,
              qualification:    edu.qualification,
              level:            normaliseLevelKey(edu.level),  // Gap 2 fix
              field_of_study:   edu.field,
              institution:      edu.institution,
              year_completed:   edu.yearCompleted ? parseInt(edu.yearCompleted, 10) : null,
              accolade_file_path: accoladeFilePath,
            };
          })
        );
        await sql`INSERT INTO education ${sql(educationRows)}`;
      }

      reply.status(201).send({ applicationId });
    } catch (err) {
      // Mark the application as failed so it can be cleaned up later.
      // Mirrors the rollback behaviour in the original applicationService.ts.
      await sql`
        UPDATE applications SET status = 'submission_failed' WHERE id = ${applicationId}
      `.catch(() => {}); // best-effort; don't mask the original error

      const msg = err instanceof Error ? err.message : "Unknown error";
      reply.status(500).send({ error: `Application submission failed: ${msg}` });
    }
  });
};

export default publicApplicationsRoutes;
