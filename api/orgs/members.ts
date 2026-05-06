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

  // Auth check
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check user is org member
  const userRole = await sql`
    SELECT role FROM organization_members
    WHERE org_id = ${orgId} AND user_id = ${decoded.userId}
  `;

  if (userRole.length === 0) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const isOrgAdmin = userRole[0].role === 'org_admin';

  if (req.method === 'GET') {
    try {
      const members = await sql`
        SELECT 
          om.id,
          om.org_id,
          om.user_id,
          om.role,
          om.joined_at,
          u.email,
          u.first_name,
          u.last_name
        FROM organization_members om
        INNER JOIN users u ON om.user_id = u.id
        WHERE om.org_id = ${orgId}
        ORDER BY om.joined_at DESC
      `;

      return res.status(200).json(members);
    } catch (error) {
      console.error('Get members error:', error);
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  }

  if (req.method === 'POST') {
    // Add team member
    if (!isOrgAdmin) {
      return res.status(403).json({ error: 'Only org admins can add members' });
    }

    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role required' });
      }

      // Check if user exists
      const existingUsers = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      let userId: string;
      if (existingUsers.length === 0) {
        // Create user with temporary password (they should reset)
        const tempPassword = Math.random().toString(36).slice(2, 12);
        const passwordHash = Buffer.from(tempPassword).toString('base64');

        const newUsers = await sql`
          INSERT INTO users (email, password_hash, user_type, is_active)
          VALUES (${email}, ${passwordHash}, 'recruiter', true)
          RETURNING id
        `;

        userId = (newUsers[0] as any).id;
      } else {
        userId = (existingUsers[0] as any).id;
      }

      // Add to org
      const result = await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${orgId}, ${userId}, ${role})
        ON CONFLICT (org_id, user_id) DO UPDATE
        SET role = ${role}
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('Add member error:', error);
      return res.status(500).json({ error: 'Failed to add member' });
    }
  }

  if (req.method === 'PATCH') {
    // Update member role
    if (!isOrgAdmin) {
      return res.status(403).json({ error: 'Only org admins can update members' });
    }

    try {
      const { userId, role } = req.body;

      const result = await sql`
        UPDATE organization_members
        SET role = ${role}
        WHERE org_id = ${orgId} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Update member error:', error);
      return res.status(500).json({ error: 'Failed to update member' });
    }
  }

  if (req.method === 'DELETE') {
    // Remove member
    if (!isOrgAdmin) {
      return res.status(403).json({ error: 'Only org admins can remove members' });
    }

    try {
      const { userId } = req.body;

      await sql`
        DELETE FROM organization_members
        WHERE org_id = ${orgId} AND user_id = ${userId}
      `;

      return res.status(200).json({ message: 'Member removed' });
    } catch (error) {
      console.error('Remove member error:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
