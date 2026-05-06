import sql from '../_lib/db';

interface LoginRequest {
  email: string;
  password: string;
}

// Simple password hashing (in production, use bcrypt)
async function hashPassword(password: string): Promise<string> {
  return Buffer.from(password).toString('base64');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Find user
    const users = await sql`
      SELECT id, email, password_hash, user_type, first_name, last_name, is_active
      FROM users
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

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

    // Set session cookie
    const token = Buffer.from(JSON.stringify({ userId: user.id, email })).toString('base64');
    res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict`);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
      },
      orgMember,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
