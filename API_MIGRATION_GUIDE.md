# API Migration Guide: Hobby Plan Optimization

## Overview

Consolidated 25+ API endpoints into 9 serverless functions to fit within Vercel's Hobby plan limit of 12 functions.

## Serverless Functions (9 total)

### 1. **api/auth.ts** - Authentication
- `POST /api/auth?action=register` - User registration
- `POST /api/auth?action=login` - User login
- `GET /api/auth?action=me` - Get current user session
- `POST /api/auth?action=logout` - User logout

### 2. **api/users.ts** - User Profile Management
- `GET /api/users?action=profile` - Get user profile
- `PATCH /api/users?action=profile` - Update user profile
- `GET /api/users?action=applications` - Get user applications

### 3. **api/organizations.ts** - Organization & Team Management
- `GET /api/organizations` - List user organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations?action=jobs&orgId=X` - Get org jobs
- `POST /api/organizations?action=jobs&orgId=X` - Create job
- `GET /api/organizations?action=members&orgId=X` - List team members
- `POST /api/organizations?action=members&orgId=X` - Add team member
- `DELETE /api/organizations?action=members&orgId=X&memberId=X` - Remove member
- `GET /api/organizations?action=analytics&orgId=X` - Get org analytics

### 4. **api/jobs.ts** - Job Listings & Applications
- `GET /api/jobs` - List public jobs
- `GET /api/jobs?id=X` - Get job details
- `POST /api/jobs?action=apply` - Apply to job
- `GET /api/jobs?action=my-applications` - Get user's applications

### 5. **api/candidates.ts** - Candidate Pipeline Management
- `GET /api/candidates?action=list&jobId=X` - List job candidates
- `POST /api/candidates?action=create&jobId=X` - Add candidate
- `PATCH /api/candidates?action=update&jobId=X&candidateId=X` - Update candidate
- `DELETE /api/candidates?action=delete&jobId=X&candidateId=X` - Remove candidate

### 6. **api/communications.ts** - Email Templates & Communications
- `GET /api/communications?action=templates&orgId=X` - Get templates
- `POST /api/communications?action=send&orgId=X` - Send communication
- `POST /api/communications?action=create-template&orgId=X` - Create template

### 7. **api/applications.ts** - Detailed Job Applications
- `POST /api/applications` - Submit application with detailed info
- Complex application handling with experience, education, custom questions

### 8. **api/storage.ts** - File Storage (Vercel Blob)
- `POST /api/storage?action=upload` - Upload file to Blob
- `GET /api/storage?action=upload-url` - Get upload URL

### 9. **api/integrations.ts** - External Integrations
- `GET /api/integrations?action=get-jobs&type=odoo` - Fetch Odoo jobs
- `GET /api/integrations?action=get-applications&type=odoo` - Fetch Odoo applications
- `POST /api/integrations?action=push-job&type=odoo` - Push job to Odoo
- `PATCH /api/integrations?action=patch-application&type=odoo` - Update application in Odoo

## Migration from Old Structure

### Before (25+ functions)
```
api/
  auth/login.ts          → api/auth.ts?action=login
  auth/register.ts       → api/auth.ts?action=register
  auth/me.ts             → api/auth.ts?action=me
  auth/logout.ts         → api/auth.ts?action=logout
  orgs/index.ts          → api/organizations.ts
  orgs/jobs.ts           → api/organizations.ts?action=jobs
  orgs/members.ts        → api/organizations.ts?action=members
  orgs/analytics.ts      → api/organizations.ts?action=analytics
  users/profile.ts       → api/users.ts?action=profile
  jobs/index.ts          → api/jobs.ts
  jobs/[id].ts           → api/jobs.ts?id=X
  jobs/candidates.ts     → api/candidates.ts
  communications/templates.ts → api/communications.ts
  blob/upload.ts         → api/storage.ts?action=upload
  blob/upload-url.ts     → api/storage.ts?action=upload-url
  odoo/get-jobs.ts       → api/integrations.ts?type=odoo&action=get-jobs
  odoo/get-applications.ts → api/integrations.ts?type=odoo&action=get-applications
  odoo/push-job.ts       → api/integrations.ts?type=odoo&action=push-job
  odoo/patch-application.ts → api/integrations.ts?type=odoo&action=patch-application
```

## Frontend Integration Changes

Update all API calls to use the new consolidated endpoints with query parameters:

### Example Changes

#### Authentication
```javascript
// Old
POST /api/auth/login
// New
POST /api/auth?action=login

// Old
POST /api/auth/register
// New
POST /api/auth?action=register

// Old
GET /api/auth/me
// New
GET /api/auth?action=me
```

#### Organizations
```javascript
// Old
POST /api/orgs/index
// New
POST /api/organizations

// Old
GET /api/orgs/jobs?orgId=X
// New
GET /api/organizations?action=jobs&orgId=X

// Old
GET /api/orgs/analytics?orgId=X
// New
GET /api/organizations?action=analytics&orgId=X
```

#### User Profile
```javascript
// Old
GET /api/users/profile
// New
GET /api/users?action=profile

// Old
PATCH /api/users/profile
// New
PATCH /api/users?action=profile
```

#### File Storage
```javascript
// Old
POST /api/blob/upload
// New
POST /api/storage?action=upload

// Old
GET /api/blob/upload-url
// New
GET /api/storage?action=upload-url
```

## Deployment Verification

Run before deploying:

```bash
# Count API functions (should be 9 or less)
find api -name "*.ts" | grep -v _lib | wc -l

# Check for syntax errors
npx tsc --noEmit

# Build the project
npm run build
```

## Benefits

1. **Vercel Hobby Plan Compatible** - Fits within 12 function limit
2. **Reduced Cold Starts** - Fewer function instances to spin up
3. **Simplified Routing** - Easier to manage with query parameters
4. **Better Code Organization** - Grouped by domain instead of hierarchy
5. **Easier to Scale** - Can be broken out later when upgrading plans

## Next Steps

1. Update all frontend API calls to use new endpoints
2. Update authentication context to use new auth endpoints
3. Update all API utility functions/hooks to reflect new paths
4. Test all endpoints thoroughly before deployment
5. Monitor Vercel analytics for function usage and performance

## Support for Future Functions

If you upgrade to a Pro plan (100+ functions), you can further consolidate by splitting:

- `api/organizations.ts` → `api/orgs.ts`, `api/jobs.ts`, `api/members.ts`, `api/analytics.ts`
- `api/communications.ts` → `api/email-templates.ts`, `api/messages.ts`
- `api/integrations.ts` → Individual integration files per provider

This architecture makes it easy to scale up or down based on your needs.
