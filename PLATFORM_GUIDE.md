# Hybrid SaaS Recruitment Platform - Implementation Guide

## Overview

This is a comprehensive multi-tenant SaaS recruitment platform built on React, Neon PostgreSQL, and Vercel serverless functions. It supports three user types (Applicants, Recruiters, Organization Admins) with role-based access control and a sophisticated hiring pipeline management system.

## Architecture

### Database Schema
- **organizations**: Multi-tenant organizations
- **users**: Unified user authentication (applicant/recruiter)
- **organization_members**: Team structure with roles
- **applicant_profiles**: Structured candidate data (source of truth)
- **jobs**: Job postings with custom fields
- **pipeline_stages**: Custom pipeline stages per job
- **candidates_in_pipeline**: Candidate tracking with scoring
- **communications**: Email templates and history

### User Roles & Access

**Applicants**
- Browse public jobs
- Create/update own profile
- Apply to jobs with custom fields
- Track application status
- Receive email notifications

**Recruiters**
- Create jobs within organization
- Manage hiring pipeline (Kanban)
- Screen candidates and add notes
- Send bulk emails
- View organization analytics

**Organization Admins**
- All recruiter permissions
- Manage team members and roles
- View comprehensive organization analytics
- Organization settings

**SaaS Admins** (Future Phase)
- Approve/suspend organizations
- View platform-wide usage metrics
- System administration

### Technology Stack
- **Frontend**: React 18 + React Router
- **UI Components**: shadcn/ui + Tailwind CSS
- **Charting**: Recharts
- **Backend**: Vercel Serverless Functions
- **Database**: Neon PostgreSQL (HTTP API)
- **Storage**: Vercel Blob
- **State Management**: React Context + TanStack Query
- **Form Handling**: React Hook Form + Zod

---

## API Routes

### Authentication (`/api/auth/*`)
```
POST   /api/auth/register         - User signup
POST   /api/auth/login            - User login
GET    /api/auth/me               - Get current session
POST   /api/auth/logout           - Clear session
```

### Organizations (`/api/orgs/*`)
```
POST   /api/orgs                  - Create organization
GET    /api/orgs                  - List user's organizations
GET    /api/orgs/:orgId/members   - List team members
POST   /api/orgs/:orgId/members   - Add member
PATCH  /api/orgs/:orgId/members   - Update member role
DELETE /api/orgs/:orgId/members   - Remove member
GET    /api/orgs/:orgId/jobs      - List organization jobs
POST   /api/orgs/:orgId/jobs      - Create job
GET    /api/orgs/:orgId/analytics - Organization metrics
```

### Jobs (`/api/jobs/*`)
```
GET    /api/jobs/:jobId/candidates      - Get candidates for job
PATCH  /api/jobs/:jobId/candidates      - Update candidate pipeline position
```

### Applicant Profiles (`/api/users/*`)
```
GET    /api/users/:userId/profile       - Get applicant profile
PATCH  /api/users/:userId/profile       - Update profile
```

### Communications (`/api/communications/*`)
```
GET    /api/communications/templates/:orgId     - Get email templates
POST   /api/communications/templates/:orgId     - Send communication
```

---

## Frontend Routes

### Public
- `/` - Homepage with job listings
- `/jobs` - All open positions
- `/jobs/:jobId` - Job detail
- `/apply/:jobId` - Application form

### Authentication
- `/auth/login` - Login page
- `/auth/signup` - Signup with role selection

### Applicant Portal
- `/dashboard/applicant` - Applicant dashboard
- `/profile` - Edit applicant profile

### Recruiter Portal
- `/dashboard/recruiter` - Recruiter main dashboard
- `/pipeline/:jobId` - Kanban pipeline for job
- `/communications` - Email templates (future)
- `/team-management` - Team member management (future)
- `/jobs/create` - Create new job (future)

### Organization Admin
- `/dashboard/admin` - Organization-level analytics
- `/org-settings` - Organization configuration (future)

---

## Key Features Implemented

### Phase 1: Foundation ✅
- [x] Multi-tenant database schema with RLS
- [x] User authentication (signup/login/logout)
- [x] Role-based access control
- [x] Protected route wrappers
- [x] Organization management

### Phase 2: Applicant Portal ✅
- [x] Applicant dashboard
- [x] Structured profile editor (skills, portfolio, preferences)
- [x] Job browsing and filtering
- [x] Application tracking (API ready)

### Phase 3: Recruiter Portal ✅
- [x] Kanban pipeline (drag-and-drop)
- [x] Candidate management
- [x] Candidate scoring and notes
- [x] Pipeline stage management
- [x] Bulk candidate actions

### Phase 4: Organization Management ✅
- [x] Team member management
- [x] Organization analytics dashboard
- [x] Job creation API
- [x] Email communication API

### Phase 5: Advanced Features (Partial)
- [x] Analytics with Recharts
- [ ] Email template customization
- [ ] Advanced filtering and saved searches
- [ ] Activity timeline and comments
- [ ] Document uploads and parsing

### Phase 6: Polish (Future)
- [ ] Performance optimizations
- [ ] Advanced search and filtering UI
- [ ] Mobile responsiveness enhancements
- [ ] Accessibility improvements
- [ ] External API integrations

---

## Getting Started

### Environment Setup
Ensure you have the following environment variables set:
```
DATABASE_URL=your_neon_postgresql_url
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### Running the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Database Migration
The migration files are in `/supabase/`:
- `migration_full.sql` - Original schema (jobs, applications, experience, education)
- `migration_saas_structure.sql` - Multi-tenant enhancements

To apply migrations, execute them against your Neon PostgreSQL database.

---

## Common Workflows

### Creating an Organization
1. User signs up as a "Recruiter"
2. System automatically creates organization
3. User added as `org_admin`
4. User can now invite team members

### Posting a Job
1. Org admin/recruiter creates job with title, description, custom fields
2. System creates default pipeline stages: Screening → Interview → Offer → Hired
3. Job becomes visible to applicants (status='open')
4. Candidates can apply with custom field data

### Managing Pipeline
1. Recruiter views Kanban pipeline for job
2. Candidates appear as draggable cards in pipeline stages
3. Drag candidate between stages (e.g., Screening → Interview)
4. Click card for detailed view with notes and history

### Sending Communications
1. Recruiter selects email template (Welcome, Interview Invite, Offer, etc.)
2. System fills template with candidate/job data
3. Email sent to candidate, logged in communications table

---

## Database Security

### Row-Level Security (RLS) Policies
- **Organizations**: Only org members can view/edit
- **Users**: Can read public profiles, only update own
- **Pipeline**: Org members can only access org's jobs/candidates
- **Communications**: Org members can view/send within org
- **Jobs**: Public read for open jobs, org members can manage

### Authentication
- Simple JWT-based session stored in HTTP-only cookies
- Password hashing (base64 in demo, should use bcrypt in production)
- Token validation on protected endpoints

---

## Performance Considerations

1. **Database Queries**
   - Indexed on frequently queried columns (org_id, user_id, job_id, status)
   - Use connection pooling via Neon HTTP API

2. **Frontend**
   - React Query for caching and synchronization
   - Component splitting to avoid unnecessary re-renders
   - Lazy loading for pipeline candidates

3. **APIs**
   - Serverless functions scale automatically
   - Pagination ready in candidate queries (add limit/offset)
   - Batch operations for bulk actions

---

## Benchmarking Against Competitors

### Monday.com Inspiration
- ✅ Clean Kanban board with drag-and-drop
- ✅ Multiple view types (list, board)
- ✅ Color-coded statuses and badges
- ✅ Inline editing for candidate notes
- Future: Timeline view, automations, webhooks

### PowerSchool Inspiration
- ✅ Professional dashboard with key metrics
- ✅ Hierarchical organization structure
- ✅ Role-based access indicators
- ✅ Recharts-based visualizations
- Future: Advanced reporting, custom views

### BrighterMonday Inspiration
- ✅ Structured applicant profiles
- ✅ Job browsing with filters
- ✅ Application status tracking
- ✅ Email notifications
- Future: AI recommendations, skill matching

---

## Future Enhancements

1. **AI & Automation**
   - Resume parsing and structured data extraction
   - Candidate scoring algorithms
   - Job recommendations
   - Interview scheduling automation

2. **Advanced Features**
   - Saved searches and candidate pools
   - Interview scheduling and reminders
   - Offer letter generation
   - Background check integration
   - Skills assessment integration

3. **Scalability**
   - Batch import of candidates (CSV)
   - Webhook integrations
   - Third-party ATS integrations
   - API for external tools

4. **Analytics**
   - Time-to-hire metrics
   - Offer acceptance rates
   - Hiring funnel analysis
   - Team performance dashboards

---

## Troubleshooting

### Common Issues

**"Not authenticated" errors**
- Check auth_token cookie is set
- Verify token format (base64 encoded JSON)
- Clear cookies and re-login

**Pipeline candidates not showing**
- Verify job has applications/candidates
- Check user belongs to organization
- Verify candidates_in_pipeline table has records

**Profile not saving**
- Check request body includes all required fields
- Verify authentication token is valid
- Check applicant_profiles table exists

**CORS errors**
- Ensure API routes handle preflight requests
- Verify headers in API responses

---

## Support & Feedback

For issues, enhancements, or questions:
1. Check the implementation plan in `/v0_plans/quick-draft.md`
2. Review API route implementations
3. Check component prop types and usage

---

**Last Updated**: May 2026
**Phase**: 4 of 6 (Organization Management Complete)
