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

// GET /api/organizations - list user's orgs
// POST /api/organizations - create org
async function handleOrganizations(req: any, res: any) {
  const token = getAuthToken(req);
  const decoded = token ? decodeToken(token) : null;

  if (req.method === 'POST') {
    if (!decoded) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const { name, plan_type } = req.body;
      if (!name) return res.status(400).json({ error: 'Organization name required' });

      const orgResult = await sql`
        INSERT INTO organizations (name, plan_type, status, created_by)
        VALUES (${name}, ${plan_type || 'starter'}, 'active', ${decoded.userId})
        RETURNING *
      `;

      const orgId = (orgResult[0] as any).id;
      await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${orgId}, ${decoded.userId}, 'org_admin')
      `;

      return res.status(201).json(orgResult[0]);
    } catch (error) {
      console.error('Create org error:', error);
      return res.status(500).json({ error: 'Failed to create organization' });
    }
  }

  if (req.method === 'GET') {
    if (!decoded) return res.status(401).json({ error: 'Not authenticated' });

    try {
      const orgs = await sql`
        SELECT o.* FROM organizations o
        INNER JOIN organization_members om ON o.id = om.org_id
        WHERE om.user_id = ${decoded.userId}
        ORDER BY o.created_at DESC
      `;
      return res.status(200).json(orgs);
    } catch (error) {
      console.error('Get orgs error:', error);
      return res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// GET /api/organizations?action=jobs&orgId=X - get org jobs
// POST /api/organizations?action=jobs&orgId=X - create job
async function handleOrgJobs(req: any, res: any, orgId: string) {
  const token = getAuthToken(req);
  const decoded = token ? decodeToken(token) : null;

  if (['POST', 'PATCH', 'DELETE'].includes(req.method) && !decoded) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
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
      const { title, description, location, department, job_type, closing_date, custom_fields } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description required' });
      }

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

      const stageNames = ['Screening', 'Interview', 'Offer', 'Hired'];
      for (let i = 0; i < stageNames.length; i++) {
        await sql`
          INSERT INTO pipeline_stages (job_id, stage_name, position_order)
          VALUES (${(result[0] as any).id}, ${stageNames[i]}, ${i + 1})
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

// GET /api/organizations?action=analytics&orgId=X
async function handleOrgAnalytics(req: any, res: any, orgId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const decoded = decodeToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });

  const member = await sql`
    SELECT * FROM organization_members
    WHERE org_id = ${orgId} AND user_id = ${decoded.userId}
  `;

  if (member.length === 0) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
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

// GET /api/organizations?action=members&orgId=X
// POST /api/organizations?action=members&orgId=X
// DELETE /api/organizations?action=members&orgId=X&memberId=X
async function handleOrgMembers(req: any, res: any, orgId: string) {
  const token = getAuthToken(req);
  const decoded = token ? decodeToken(token) : null;

  if (!decoded) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method === 'GET') {
    try {
      const members = await sql`
        SELECT om.*, u.email, u.first_name, u.last_name
        FROM organization_members om
        JOIN users u ON om.user_id = u.id
        WHERE om.org_id = ${orgId}
        ORDER BY om.created_at DESC
      `;
      return res.status(200).json(members);
    } catch (error) {
      console.error('Get members error:', error);
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { email, role } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required' });

      let userId: string;
      const existingUsers = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUsers.length > 0) {
        userId = (existingUsers[0] as any).id;
      } else {
        const newUsers = await sql`
          INSERT INTO users (email, password_hash, user_type, is_active)
          VALUES (${email}, '', 'recruiter', true)
          RETURNING id
        `;
        userId = (newUsers[0] as any).id;
      }

      const memberResult = await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${orgId}, ${userId}, ${role || 'recruiter'})
        RETURNING *
      `;

      return res.status(201).json(memberResult[0]);
    } catch (error) {
      console.error('Add member error:', error);
      return res.status(500).json({ error: 'Failed to add member' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { memberId } = req.query;
      if (!memberId) return res.status(400).json({ error: 'Member ID required' });

      await sql`
        DELETE FROM organization_members
        WHERE id = ${memberId} AND org_id = ${orgId}
      `;

      return res.status(200).json({ message: 'Member removed' });
    } catch (error) {
      console.error('Remove member error:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req: any, res: any) {
  const action = req.query.action as string;
  const orgId = req.query.orgId as string;

  try {
    if (!action || action === 'list') {
      return await handleOrganizations(req, res);
    } else if (action === 'jobs') {
      return await handleOrgJobs(req, res, orgId);
    } else if (action === 'analytics') {
      return await handleOrgAnalytics(req, res, orgId);
    } else if (action === 'members') {
      return await handleOrgMembers(req, res, orgId);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Organizations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
