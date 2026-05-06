import sql from './_lib/db';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  user_type: 'applicant' | 'recruiter';
  first_name?: string;
  last_name?: string;
}

// Password hashing (in production, use bcrypt)
async function hashPassword(password: string): Promise<string> {
  return Buffer.from(password).toString('base64');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

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

// POST /api/auth?action=register
async function handleRegister(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, user_type, first_name, last_name } = req.body as RegisterRequest;

    if (!email || !password || !user_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const password_hash = await hashPassword(password);

    const result = await sql`
      INSERT INTO users (email, password_hash, user_type, first_name, last_name, is_active)
      VALUES (${email}, ${password_hash}, ${user_type}, ${first_name || null}, ${last_name || null}, true)
      RETURNING id, email, user_type, first_name, last_name
    `;

    const user = (result[0] as any);

    if (user_type === 'applicant') {
      await sql`
        INSERT INTO applicant_profiles (user_id, skills, portfolio_links, preferred_locations)
        VALUES (${user.id}, '{}', '{}', '{}')
      `;
    }

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
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

// POST /api/auth?action=login
async function handleLogin(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const users = await sql`
      SELECT id, email, password_hash, user_type, first_name, last_name, is_active
      FROM users
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = (users[0] as any);
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    let orgMember = null;
    if (user.user_type === 'recruiter') {
      const members = await sql`
        SELECT org_id, user_id, role FROM organization_members
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      if (members.length > 0) {
        orgMember = (members[0] as any);
      }
    }

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

// GET /api/auth?action=me
async function handleMe(req: any, res: any) {
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

    const users = await sql`
      SELECT id, email, user_type, first_name, last_name, profile_picture_url, is_active
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = (users[0] as any);

    let orgMember = null;
    if (user.user_type === 'recruiter') {
      const members = await sql`
        SELECT org_id, user_id, role FROM organization_members
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      if (members.length > 0) {
        orgMember = (members[0] as any);
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

// POST /api/auth?action=logout
async function handleLogout(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
  return res.status(200).json({ message: 'Logged out successfully' });
}

export default async function handler(req: any, res: any) {
  const action = req.query.action || 'login';

  try {
    switch (action) {
      case 'register':
        return await handleRegister(req, res);
      case 'login':
        return await handleLogin(req, res);
      case 'me':
        return await handleMe(req, res);
      case 'logout':
        return await handleLogout(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
