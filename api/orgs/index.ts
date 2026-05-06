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
  const token = getAuthToken(req);

  if (req.method === 'POST') {
    // Create organization
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    try {
      const { name, plan_type } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Organization name required' });
      }

      // Create org
      const orgResult = await sql`
        INSERT INTO organizations (name, plan_type, status, created_by)
        VALUES (${name}, ${plan_type || 'starter'}, 'active', ${decoded.userId})
        RETURNING *
      `;

      const orgId = orgResult[0].id;

      // Add creator as org_admin
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
    // Get user's organizations
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

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
