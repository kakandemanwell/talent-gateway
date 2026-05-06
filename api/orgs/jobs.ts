import sql from '../_lib/db';

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

export default async function handler(req: any, res: any) {
  const { orgId } = req.query;

  // Auth check for POST/PATCH/DELETE
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user belongs to org
    const members = await sql`
      SELECT * FROM organization_members
      WHERE org_id = ${orgId} AND user_id = ${decoded.userId}
    `;

    if (members.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this organization' });
    }
  }

  if (req.method === 'GET') {
    try {
      // Get all jobs for org (public endpoint for now)
      const jobs = await sql`
        SELECT * FROM jobs
        WHERE org_id = ${orgId} AND status = 'open'
        ORDER BY created_at DESC
      `;

      return res.status(200).json(jobs);
    } catch (error) {
      console.error('Get jobs error:', error);
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        title,
        description,
        location,
        department,
        job_type,
        closing_date,
        custom_fields,
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description required' });
      }

      const token = getAuthToken(req);
      const decoded = decodeToken(token!);

      const result = await sql`
        INSERT INTO jobs (
          org_id, title, description, location, department,
          closing_date, custom_fields, status, is_active, created_by
        )
        VALUES (
          ${orgId}, ${title}, ${description}, ${location || null},
          ${department || null}, ${closing_date || null},
          ${JSON.stringify(custom_fields || {})}, 'open', true, ${decoded?.userId || null}
        )
        RETURNING *
      `;

      // Create default pipeline stages
      const stageNames = ['Screening', 'Interview', 'Offer', 'Hired'];
      for (let i = 0; i < stageNames.length; i++) {
        await sql`
          INSERT INTO pipeline_stages (job_id, stage_name, position_order)
          VALUES (${result[0].id}, ${stageNames[i]}, ${i + 1})
        `;
      }

      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('Create job error:', error);
      return res.status(500).json({ error: 'Failed to create job' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
