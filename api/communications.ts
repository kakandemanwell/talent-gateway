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

const DEFAULT_TEMPLATES = [
  {
    name: 'Welcome',
    subject: 'Welcome to {company}',
    body: 'Hi {firstName},\n\nWelcome to {company}! We&apos;re excited to have you apply.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Status Update',
    subject: 'Update on your {jobTitle} application',
    body: 'Hi {firstName},\n\nThank you for applying. We&apos;ll follow up soon with an update on your application.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Interview Invite',
    subject: 'Interview Invitation - {jobTitle}',
    body: 'Hi {firstName},\n\nWe&apos;d like to invite you for an interview for the {jobTitle} position.\n\nPlease let us know your availability.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Rejection',
    subject: 'Application Status - {jobTitle}',
    body: 'Hi {firstName},\n\nThank you for your interest in the {jobTitle} position. Unfortunately, we&apos;ve decided to move forward with other candidates.\n\nBest regards,\nThe Team',
  },
  {
    name: 'Offer',
    subject: 'Job Offer - {jobTitle}',
    body: 'Hi {firstName},\n\nWe&apos;re pleased to offer you the {jobTitle} position!\n\nPlease review the attached offer and let us know if you have any questions.\n\nBest regards,\nThe Team',
  },
];

// GET /api/communications?action=templates&orgId=X
// POST /api/communications?action=send&orgId=X
async function handleCommunications(req: any, res: any) {
  const { action, orgId } = req.query;
  const token = getAuthToken(req);
  const decoded = token ? decodeToken(token) : null;

  if (!decoded) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (action === 'templates') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Get org templates
      const templates = await sql`
        SELECT * FROM communication_templates
        WHERE org_id = ${orgId}
        ORDER BY created_at DESC
      `;

      return res.status(200).json({
        default_templates: DEFAULT_TEMPLATES,
        org_templates: templates,
      });
    } catch (error) {
      console.error('Get templates error:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  if (action === 'send') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { template_id, recipient_email, variables } = req.body;

      if (!template_id || !recipient_email) {
        return res.status(400).json({ error: 'Template ID and recipient required' });
      }

      // Get template
      const templates = await sql`
        SELECT * FROM communication_templates
        WHERE id = ${template_id} AND org_id = ${orgId}
      `;

      if (templates.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const template = (templates[0] as any);

      // Replace variables in template
      let subject = template.subject;
      let body = template.body;

      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{${key}}`;
          subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
          body = body.replace(new RegExp(placeholder, 'g'), String(value));
        });
      }

      // Log communication (in real app, send email via SendGrid, SES, etc.)
      const result = await sql`
        INSERT INTO communications (org_id, recipient_email, subject, body, template_id, status)
        VALUES (${orgId}, ${recipient_email}, ${subject}, ${body}, ${template_id}, 'sent')
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('Send communication error:', error);
      return res.status(500).json({ error: 'Failed to send communication' });
    }
  }

  if (action === 'create-template') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { name, subject, body } = req.body;

      if (!name || !subject || !body) {
        return res.status(400).json({ error: 'Name, subject, and body required' });
      }

      const result = await sql`
        INSERT INTO communication_templates (org_id, name, subject, body)
        VALUES (${orgId}, ${name}, ${subject}, ${body})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('Create template error:', error);
      return res.status(500).json({ error: 'Failed to create template' });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}

export default handleCommunications;
