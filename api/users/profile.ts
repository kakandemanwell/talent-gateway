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
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { userId } = decoded;

  if (req.method === 'GET') {
    try {
      // Get profile
      const profiles = await sql`
        SELECT * FROM applicant_profiles WHERE user_id = ${userId}
      `;

      if (profiles.length === 0) {
        // Return empty profile for new applicants
        return res.status(200).json({
          user_id: userId,
          summary: '',
          skills: [],
          portfolio_links: [],
          preferred_job_type: '',
          preferred_locations: [],
        });
      }

      return res.status(200).json(profiles[0]);
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { summary, skills, portfolio_links, preferred_job_type, preferred_locations } = req.body;

      // Check if profile exists
      const existing = await sql`
        SELECT id FROM applicant_profiles WHERE user_id = ${userId}
      `;

      if (existing.length === 0) {
        // Create new profile
        const result = await sql`
          INSERT INTO applicant_profiles (
            user_id, summary, skills, portfolio_links, 
            preferred_job_type, preferred_locations
          )
          VALUES (${userId}, ${summary || null}, ${JSON.stringify(skills || [])}, 
                  ${JSON.stringify(portfolio_links || [])}, 
                  ${preferred_job_type || null}, ${JSON.stringify(preferred_locations || [])})
          RETURNING *
        `;
        return res.status(200).json(result[0]);
      }

      // Update existing profile
      const result = await sql`
        UPDATE applicant_profiles
        SET summary = ${summary || null},
            skills = ${JSON.stringify(skills || [])},
            portfolio_links = ${JSON.stringify(portfolio_links || [])},
            preferred_job_type = ${preferred_job_type || null},
            preferred_locations = ${JSON.stringify(preferred_locations || [])},
            updated_at = now()
        WHERE user_id = ${userId}
        RETURNING *
      `;

      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
