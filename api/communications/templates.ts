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

const DEFAULT_TEMPLATES = [
  {
    name: 'Welcome',
    subject: 'Welcome to {company}',
    body: 'Hi {firstName},\n\nWelcome to {company}! We\'re excited to have you apply.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Status Update',
    subject: 'Update on your {jobTitle} application',
    body: 'Hi {firstName},\n\nThank you for applying. We\'ll follow up soon with an update on your application.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Interview Invite',
    subject: 'Interview Invitation - {jobTitle}',
    body: 'Hi {firstName},\n\nWe\'d like to invite you for an interview for the {jobTitle} position.\n\nPlease let us know your availability.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Rejection',
    subject: 'Application Status - {jobTitle}',
    body: 'Hi {firstName},\n\nThank you for your interest in the {jobTitle} position. Unfortunately, we\'ve decided to move forward with other candidates.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Offer',
    subject: 'Job Offer - {jobTitle}',
    body: 'Hi {firstName},\n\nWe\'re pleased to offer you the {jobTitle} position!\n\nPlease review the attached offer and let us know if you have any questions.\n\nBest regards,\nThe Team',
  },
];

export default async function handler(req: any, res: any) {
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

  if (req.method === 'GET') {
    try {
      // For now, return default templates
      // In production, would query a templates table
      return res.status(200).json(DEFAULT_TEMPLATES);
    } catch (error) {
      console.error('Get templates error:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { recipient_email, template_type, job_id, candidate_id, subject, body } = req.body;

      if (!recipient_email || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sql`
        INSERT INTO communications (
          organization_id, recipient_email, template_type, 
          job_id, candidate_id, subject, body, status
        )
        VALUES (
          ${orgId}, ${recipient_email}, ${template_type || 'custom'},
          ${job_id || null}, ${candidate_id || null}, ${subject}, ${body}, 'pending'
        )
        RETURNING *
      `;

      // In production, would actually send the email here
      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('Send communication error:', error);
      return res.status(500).json({ error: 'Failed to send communication' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
