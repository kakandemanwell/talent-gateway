/**
 * Consolidated Odoo/External Integration Endpoint
 * 
 * GET /api/integrations?action=get-jobs&type=odoo
 * GET /api/integrations?action=get-applications&type=odoo
 * POST /api/integrations?action=push-job&type=odoo
 * PATCH /api/integrations?action=patch-application&type=odoo
 */

import sql from "./_lib/db.js";

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

async function getOdooJobs(req: any, res: any) {
  // Fetch jobs from Odoo - placeholder for actual Odoo API call
  try {
    // This would call Odoo API with proper authentication
    // For now, return empty to maintain compatibility
    return res.status(200).json({ jobs: [] });
  } catch (error) {
    console.error('Get Odoo jobs error:', error);
    return res.status(500).json({ error: 'Failed to fetch Odoo jobs' });
  }
}

async function getOdooApplications(req: any, res: any) {
  // Fetch applications from Odoo
  try {
    // This would call Odoo API
    return res.status(200).json({ applications: [] });
  } catch (error) {
    console.error('Get Odoo applications error:', error);
    return res.status(500).json({ error: 'Failed to fetch Odoo applications' });
  }
}

async function pushJobToOdoo(req: any, res: any) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { job_id } = req.body;
    if (!job_id) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    // Fetch job from our database and push to Odoo
    const jobs = await sql`SELECT * FROM jobs WHERE id = ${job_id}`;
    if (jobs.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // This would push the job to Odoo API
    return res.status(200).json({ message: 'Job pushed to Odoo', job: jobs[0] });
  } catch (error) {
    console.error('Push job error:', error);
    return res.status(500).json({ error: 'Failed to push job to Odoo' });
  }
}

async function patchApplicationInOdoo(req: any, res: any) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { application_id, status } = req.body;
    if (!application_id) {
      return res.status(400).json({ error: 'Application ID required' });
    }

    // Update application status in both our DB and Odoo
    await sql`
      UPDATE applications
      SET status = ${status || 'reviewed'}
      WHERE id = ${application_id}
    `;

    // This would sync with Odoo API
    return res.status(200).json({ message: 'Application updated' });
  } catch (error) {
    console.error('Patch application error:', error);
    return res.status(500).json({ error: 'Failed to update application' });
  }
}

export default async function handler(req: any, res: any) {
  const { action, type } = req.query;

  try {
    if (type === 'odoo') {
      switch (action) {
        case 'get-jobs':
          return await getOdooJobs(req, res);
        case 'get-applications':
          return await getOdooApplications(req, res);
        case 'push-job':
          return await pushJobToOdoo(req, res);
        case 'patch-application':
          return await patchApplicationInOdoo(req, res);
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    return res.status(400).json({ error: 'Invalid integration type' });
  } catch (error) {
    console.error('Integration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
