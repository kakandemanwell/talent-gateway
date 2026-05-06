import sql from './_lib/db';

function getAuthToken(req: any): string | null {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
}

function decodeToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// GET /api/jobs - list public jobs
// GET /api/jobs?id=X - get job details
// POST /api/jobs?action=apply - apply to job
// GET /api/jobs?action=my-applications - get user applications
async function handleJobs(req: any, res: any) {
  const { id, action } = req.query;
  const token = getAuthToken(req);
  const decoded = token ? decodeToken(token) : null;

  try {
    // GET /api/jobs - list public jobs
    if (req.method === 'GET' && !id && !action) {
      const { search, location, department } = req.query;
      let query = sql`SELECT * FROM jobs WHERE status = 'open' AND is_active = true`;

      if (search) {
        query = sql`SELECT * FROM jobs WHERE status = 'open' AND is_active = true AND (title ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`})`;
      }

      const jobs = await query;
      return res.status(200).json(jobs);
    }

    // GET /api/jobs?id=X - get job details
    if (req.method === 'GET' && id) {
      const job = await sql`SELECT * FROM jobs WHERE id = ${id}`;

      if (job.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json(job[0]);
    }

    // POST /api/jobs?action=apply - apply to job
    if (req.method === 'POST' && action === 'apply') {
      if (!decoded) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { job_id, cover_letter } = req.body;

      if (!job_id) {
        return res.status(400).json({ error: 'Job ID required' });
      }

      // Check if already applied
      const existing = await sql`
        SELECT id FROM applications
        WHERE job_id = ${job_id} AND user_id = ${decoded.userId}
      `;

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Already applied to this job' });
      }

      const result = await sql`
        INSERT INTO applications (job_id, user_id, status, cover_letter)
        VALUES (${job_id}, ${decoded.userId}, 'new', ${cover_letter || null})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    }

    // GET /api/jobs?action=my-applications - get user applications
    if (req.method === 'GET' && action === 'my-applications') {
      if (!decoded) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const applications = await sql`
        SELECT a.*, j.title as job_title, j.description
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.user_id = ${decoded.userId}
        ORDER BY a.created_at DESC
      `;

      return res.status(200).json(applications);
    }

    return res.status(400).json({ error: 'Invalid action or method' });
  } catch (error) {
    console.error('Jobs error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

export default handleJobs;
