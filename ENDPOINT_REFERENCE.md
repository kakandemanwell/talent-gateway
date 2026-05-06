# Consolidated API Endpoint Reference

## Quick Lookup Table

| Function | Old Paths | New Path | Method | Purpose |
|----------|-----------|----------|--------|---------|
| **auth.ts** | `/api/auth/login` | `/api/auth?action=login` | POST | User login |
| | `/api/auth/register` | `/api/auth?action=register` | POST | User registration |
| | `/api/auth/me` | `/api/auth?action=me` | GET | Get current user |
| | `/api/auth/logout` | `/api/auth?action=logout` | POST | User logout |
| **users.ts** | `/api/users/profile` | `/api/users?action=profile` | GET/PATCH | User profile |
| | N/A | `/api/users?action=applications` | GET | User applications |
| **organizations.ts** | `/api/orgs` | `/api/organizations` | GET/POST | List/create orgs |
| | `/api/orgs/jobs?orgId=X` | `/api/organizations?action=jobs&orgId=X` | GET/POST | Org jobs |
| | `/api/orgs/members?orgId=X` | `/api/organizations?action=members&orgId=X` | GET/POST/DEL | Team members |
| | `/api/orgs/analytics?orgId=X` | `/api/organizations?action=analytics&orgId=X` | GET | Org analytics |
| **jobs.ts** | `/api/jobs` | `/api/jobs` | GET | List jobs |
| | `/api/jobs/[id]` | `/api/jobs?id=X` | GET | Job details |
| | N/A | `/api/jobs?action=apply` | POST | Apply to job |
| | N/A | `/api/jobs?action=my-applications` | GET | User applications |
| **candidates.ts** | `/api/jobs/candidates` | `/api/candidates?action=list&jobId=X` | GET | List candidates |
| | N/A | `/api/candidates?action=create&jobId=X` | POST | Add candidate |
| | N/A | `/api/candidates?action=update&jobId=X&candidateId=X` | PATCH | Update candidate |
| | N/A | `/api/candidates?action=delete&jobId=X&candidateId=X` | DELETE | Remove candidate |
| **communications.ts** | `/api/communications/templates` | `/api/communications?action=templates&orgId=X` | GET | Get templates |
| | N/A | `/api/communications?action=send&orgId=X` | POST | Send email |
| | N/A | `/api/communications?action=create-template&orgId=X` | POST | Create template |
| **applications.ts** | `/api/applications` | `/api/applications` | POST | Submit application |
| **storage.ts** | `/api/blob/upload` | `/api/storage?action=upload` | POST | Upload file |
| | `/api/blob/upload-url` | `/api/storage?action=upload-url` | GET | Get upload URL |
| **integrations.ts** | `/api/odoo/get-jobs` | `/api/integrations?type=odoo&action=get-jobs` | GET | Fetch Odoo jobs |
| | `/api/odoo/get-applications` | `/api/integrations?type=odoo&action=get-applications` | GET | Fetch applications |
| | `/api/odoo/push-job` | `/api/integrations?type=odoo&action=push-job` | POST | Push job to Odoo |
| | `/api/odoo/patch-application` | `/api/integrations?type=odoo&action=patch-application` | PATCH | Update in Odoo |

## Common Query Parameters

| Parameter | Used In | Purpose |
|-----------|---------|---------|
| `action` | All | Specifies which sub-action to perform |
| `orgId` | organizations, communications | Organization ID |
| `jobId` | candidates, jobs | Job ID |
| `id` | jobs | Job ID (alternate) |
| `candidateId` | candidates | Candidate ID |
| `memberId` | organizations | Team member ID |
| `type` | integrations | Integration type (e.g., "odoo") |

## Frontend Import Examples

```javascript
// Authentication
fetch('/api/auth?action=login', { method: 'POST', body: JSON.stringify({...}) })
fetch('/api/auth?action=register', { method: 'POST', body: JSON.stringify({...}) })
fetch('/api/auth?action=me', { method: 'GET' })
fetch('/api/auth?action=logout', { method: 'POST' })

// Organizations
fetch('/api/organizations', { method: 'GET' })
fetch('/api/organizations', { method: 'POST', body: JSON.stringify({...}) })
fetch('/api/organizations?action=jobs&orgId=123', { method: 'GET' })
fetch('/api/organizations?action=analytics&orgId=123', { method: 'GET' })

// Jobs
fetch('/api/jobs', { method: 'GET' })
fetch('/api/jobs?id=123', { method: 'GET' })
fetch('/api/jobs?action=apply', { method: 'POST', body: JSON.stringify({...}) })

// User Profile
fetch('/api/users?action=profile', { method: 'GET' })
fetch('/api/users?action=profile', { method: 'PATCH', body: JSON.stringify({...}) })

// File Upload
const formData = new FormData()
formData.append('file', file)
formData.append('pathname', 'uploads/cv.pdf')
fetch('/api/storage?action=upload', { method: 'POST', body: formData })
```

## curl Examples

```bash
# Login
curl -X POST http://localhost:5173/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get user
curl http://localhost:5173/api/auth?action=me

# List organizations
curl http://localhost:5173/api/organizations

# Get org jobs
curl http://localhost:5173/api/organizations?action=jobs&orgId=123

# Get org analytics
curl http://localhost:5173/api/organizations?action=analytics&orgId=123

# List jobs
curl http://localhost:5173/api/jobs

# Get job details
curl http://localhost:5173/api/jobs?id=456

# Apply to job
curl -X POST http://localhost:5173/api/jobs?action=apply \
  -H "Content-Type: application/json" \
  -d '{"job_id":"456"}'

# Get user profile
curl http://localhost:5173/api/users?action=profile

# Upload file
curl -X POST http://localhost:5173/api/storage?action=upload \
  -F "file=@./resume.pdf" \
  -F "pathname=uploads/resume.pdf"
```

## Postman Collection Template

```json
{
  "info": {
    "name": "Recruitment Platform API",
    "description": "Consolidated API endpoints"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth?action=login",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"user@example.com\",\"password\":\"password\"}"
            }
          }
        },
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth?action=register",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"user@example.com\",\"password\":\"password\",\"user_type\":\"applicant\"}"
            }
          }
        },
        {
          "name": "Get Current User",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/auth?action=me"
          }
        },
        {
          "name": "Logout",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/auth?action=logout"
          }
        }
      ]
    }
  ]
}
```

## Migration Checklist

- [ ] Update all `/api/auth/login` calls to `/api/auth?action=login`
- [ ] Update all `/api/auth/register` calls to `/api/auth?action=register`
- [ ] Update all `/api/auth/me` calls to `/api/auth?action=me`
- [ ] Update all `/api/auth/logout` calls to `/api/auth?action=logout`
- [ ] Update all `/api/orgs/` calls to `/api/organizations?action=...&orgId=...`
- [ ] Update all `/api/users/profile` calls to `/api/users?action=profile`
- [ ] Update all `/api/jobs/[id]` calls to `/api/jobs?id=...`
- [ ] Update all `/api/blob/` calls to `/api/storage?action=...`
- [ ] Test all endpoints in Postman/Insomnia
- [ ] Verify AuthContext works in browser
- [ ] Test complete login flow
- [ ] Check browser Network tab for correct URLs
- [ ] Deploy to Vercel

## Vercel Dashboard Monitoring

After deployment, monitor:
- **Functions**: Should show exactly 9 functions
- **Logs**: Check for any 404s on consolidated endpoints
- **Errors**: Look for any action parameter parsing errors
- **Duration**: Monitor if query parameter routing adds latency (should be minimal)
- **Invocations**: Track which endpoints are most used

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on `/api/auth?action=login` | Check URL has `?action=login` query parameter |
| 400 "Invalid action" | Verify action parameter matches expected values |
| Old endpoints still being called | Search codebase for `/api/auth/`, `/api/orgs/`, etc. and update |
| Postman requests fail | Set `{{base_url}}` variable to `http://localhost:5173` or your domain |
| Cookies not being set | Ensure credentials are included in fetch: `fetch(url, { credentials: 'include' })` |

