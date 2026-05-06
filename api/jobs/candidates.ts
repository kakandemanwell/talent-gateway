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
  const { jobId } = req.query;

  // Auth check
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Verify user can access this job's org
  const jobCheck = await sql`
    SELECT org_id FROM jobs WHERE id = ${jobId}
  `;

  if (jobCheck.length === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const orgId = jobCheck[0].org_id;
  const orgMember = await sql`
    SELECT * FROM organization_members
    WHERE org_id = ${orgId} AND user_id = ${decoded.userId}
  `;

  if (orgMember.length === 0) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (req.method === 'GET') {
    try {
      // Get all candidates in pipeline for this job, grouped by stage
      const candidates = await sql`
        SELECT 
          c.*, 
          u.email, 
          u.first_name, 
          u.last_name,
          ps.stage_name,
          ap.summary, 
          ap.skills
        FROM candidates_in_pipeline c
        INNER JOIN users u ON c.applicant_id = u.id
        LEFT JOIN pipeline_stages ps ON c.current_stage_id = ps.id
        LEFT JOIN applicant_profiles ap ON c.applicant_id = ap.user_id
        WHERE c.job_id = ${jobId}
        ORDER BY ps.position_order, c.ranking
      `;

      return res.status(200).json(candidates);
    } catch (error) {
      console.error('Get candidates error:', error);
      return res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { candidateId, currentStageId, matchScore, ranking, notes } = req.body;

      const result = await sql`
        UPDATE candidates_in_pipeline
        SET 
          current_stage_id = ${currentStageId || null},
          match_score = ${matchScore || null},
          ranking = ${ranking || null},
          notes = ${notes || null},
          moved_at = now(),
          updated_at = now()
        WHERE id = ${candidateId} AND job_id = ${jobId}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Update candidate error:', error);
      return res.status(500).json({ error: 'Failed to update candidate' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
