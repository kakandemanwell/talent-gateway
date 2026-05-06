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

// GET /api/candidates?action=list&jobId=X
// POST /api/candidates?action=create&jobId=X
async function handleCandidates(req: any, res: any) {
  const { jobId, action } = req.query;
  const token = getAuthToken(req);
  const decoded = token ? decodeToken(token) : null;

  if (!decoded) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Verify user can access this job
    const jobCheck = await sql`
      SELECT org_id FROM jobs WHERE id = ${jobId}
    `;

    if (jobCheck.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const orgId = (jobCheck[0] as any).org_id;
    const orgMember = await sql`
      SELECT * FROM organization_members
      WHERE org_id = ${orgId} AND user_id = ${decoded.userId}
    `;

    if (orgMember.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req.method === 'GET' && action === 'list') {
      const candidates = await sql`
        SELECT c.*, ps.stage_name
        FROM candidates_in_pipeline c
        JOIN pipeline_stages ps ON c.current_stage_id = ps.id
        WHERE c.job_id = ${jobId}
        ORDER BY c.match_score DESC
      `;
      return res.status(200).json(candidates);
    }

    if (req.method === 'POST' && action === 'create') {
      const { user_id, current_stage_id, match_score, notes } = req.body;
      if (!user_id) return res.status(400).json({ error: 'User ID required' });

      const result = await sql`
        INSERT INTO candidates_in_pipeline (job_id, user_id, current_stage_id, match_score, notes)
        VALUES (${jobId}, ${user_id}, ${current_stage_id || 1}, ${match_score || 0}, ${notes || ''})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    }

    if (req.method === 'PATCH' && action === 'update') {
      const { candidateId } = req.query;
      const { current_stage_id, match_score, notes } = req.body;

      const result = await sql`
        UPDATE candidates_in_pipeline
        SET 
          current_stage_id = COALESCE(${current_stage_id}, current_stage_id),
          match_score = COALESCE(${match_score}, match_score),
          notes = COALESCE(${notes}, notes)
        WHERE id = ${candidateId} AND job_id = ${jobId}
        RETURNING *
      `;

      return res.status(200).json(result[0]);
    }

    if (req.method === 'DELETE' && action === 'delete') {
      const { candidateId } = req.query;

      await sql`
        DELETE FROM candidates_in_pipeline
        WHERE id = ${candidateId} AND job_id = ${jobId}
      `;

      return res.status(200).json({ message: 'Candidate removed' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Candidates error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

export default handleCandidates;
