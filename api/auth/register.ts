import sql from '../_lib/db';

interface RegisterRequest {
  email: string;
  password: string;
  user_type: 'applicant' | 'recruiter';
  first_name?: string;
  last_name?: string;
}

interface RegisterResponse {
  user: {
    id: string;
    email: string;
    user_type: string;
    first_name?: string;
    last_name?: string;
  };
  message: string;
}

// Simple password hashing (in production, use bcrypt)
async function hashPassword(password: string): Promise<string> {
  // For demo: use simple base64. In production, use proper bcrypt with salt
  return Buffer.from(password).toString('base64');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, user_type, first_name, last_name } = req.body as RegisterRequest;

    if (!email || !password || !user_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, user_type, first_name, last_name, is_active)
      VALUES (${email}, ${password_hash}, ${user_type}, ${first_name || null}, ${last_name || null}, true)
      RETURNING id, email, user_type, first_name, last_name
    `;

    const user = result[0];

    // For applicants, create applicant profile
    if (user_type === 'applicant') {
      await sql`
        INSERT INTO applicant_profiles (user_id, skills, portfolio_links, preferred_locations)
        VALUES (${user.id}, '{}', '{}', '{}')
      `;
    }

    // Set session cookie (simplified JWT - use proper JWT in production)
    const token = Buffer.from(JSON.stringify({ userId: user.id, email })).toString('base64');
    res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict`);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      message: 'User created successfully',
    } as RegisterResponse);
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
