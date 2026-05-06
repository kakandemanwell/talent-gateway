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

// GET /api/users?action=profile
// PATCH /api/users?action=profile
// POST /api/users?action=upload-cv
async function handleUsers(req: any, res: any) {
  const { action } = req.query;
  const token = getAuthToken(req);
  const decoded = token ? decodeToken(token) : null;

  if (!decoded) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    if (action === 'profile') {
      if (req.method === 'GET') {
        const user = await sql`
          SELECT id, email, user_type, first_name, last_name, profile_picture_url
          FROM users
          WHERE id = ${decoded.userId}
        `;

        if (user.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        let profile = null;
        if ((user[0] as any).user_type === 'applicant') {
          const apProfile = await sql`
            SELECT * FROM applicant_profiles
            WHERE user_id = ${decoded.userId}
          `;
          if (apProfile.length > 0) {
            profile = apProfile[0];
          }
        }

        return res.status(200).json({
          user: user[0],
          profile,
        });
      }

      if (req.method === 'PATCH') {
        const { first_name, last_name, profile_picture_url, skills, portfolio_links, preferred_locations } =
          req.body;

        // Update user
        await sql`
          UPDATE users
          SET 
            first_name = COALESCE(${first_name}, first_name),
            last_name = COALESCE(${last_name}, last_name),
            profile_picture_url = COALESCE(${profile_picture_url}, profile_picture_url)
          WHERE id = ${decoded.userId}
        `;

        // Update applicant profile if provided
        if (skills || portfolio_links || preferred_locations) {
          const existing = await sql`
            SELECT id FROM applicant_profiles WHERE user_id = ${decoded.userId}
          `;

          if (existing.length > 0) {
            await sql`
              UPDATE applicant_profiles
              SET 
                skills = COALESCE(${JSON.stringify(skills)}, skills),
                portfolio_links = COALESCE(${JSON.stringify(portfolio_links)}, portfolio_links),
                preferred_locations = COALESCE(${JSON.stringify(preferred_locations)}, preferred_locations)
              WHERE user_id = ${decoded.userId}
            `;
          }
        }

        const updated = await sql`
          SELECT id, email, user_type, first_name, last_name, profile_picture_url
          FROM users
          WHERE id = ${decoded.userId}
        `;

        return res.status(200).json(updated[0]);
      }
    }

    if (action === 'applications') {
      if (req.method === 'GET') {
        const applications = await sql`
          SELECT a.*, j.title as job_title, j.description
          FROM applications a
          JOIN jobs j ON a.job_id = j.id
          WHERE a.user_id = ${decoded.userId}
          ORDER BY a.created_at DESC
        `;

        return res.status(200).json(applications);
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Users error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

export default handleUsers;
