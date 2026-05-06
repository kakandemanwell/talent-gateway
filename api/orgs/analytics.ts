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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { orgId } = req.query;

  // Verify user belongs to org
  const member = await sql`
    SELECT * FROM organization_members
    WHERE org_id = ${orgId} AND user_id = ${decoded.userId}
  `;

  if (member.length === 0) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    // Get basic metrics
    const jobStats = await sql`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_jobs,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_jobs
      FROM jobs
      WHERE org_id = ${orgId}
    `;

    const applicationStats = await sql`
      SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_applications,
        SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed_applications,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
      FROM applications
      WHERE job_id IN (SELECT id FROM jobs WHERE org_id = ${orgId})
    `;

    const pipelineStats = await sql`
      SELECT 
        COUNT(*) as total_in_pipeline,
        AVG(match_score) as avg_match_score,
        SUM(CASE WHEN match_score >= 80 THEN 1 ELSE 0 END) as high_quality_candidates
      FROM candidates_in_pipeline
      WHERE job_id IN (SELECT id FROM jobs WHERE org_id = ${orgId})
    `;

    // Stage distribution
    const stageDistribution = await sql`
      SELECT 
        ps.stage_name,
        COUNT(c.id) as count
      FROM pipeline_stages ps
      LEFT JOIN candidates_in_pipeline c ON ps.id = c.current_stage_id
      WHERE ps.job_id IN (SELECT id FROM jobs WHERE org_id = ${orgId})
      GROUP BY ps.stage_name
      ORDER BY ps.position_order
    `;

    return res.status(200).json({
      jobs: jobStats[0],
      applications: applicationStats[0],
      pipeline: pipelineStats[0],
      stage_distribution: stageDistribution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
