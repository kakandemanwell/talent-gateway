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

  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const users = await sql`
      SELECT id, email, user_type, first_name, last_name, profile_picture_url, is_active
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get org member info if recruiter
    let orgMember = null;
    if (user.user_type === 'recruiter') {
      const members = await sql`
        SELECT org_id, user_id, role FROM organization_members
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      if (members.length > 0) {
        orgMember = members[0];
      }
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture_url: user.profile_picture_url,
        is_active: user.is_active,
      },
      orgMember,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return res.status(500).json({ error: 'Session check failed' });
  }
}
