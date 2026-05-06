# Recruitment Platform API Reference

## Authentication Endpoints

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "user_type": "applicant" | "recruiter"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_type": "applicant",
    "first_name": null,
    "last_name": null
  },
  "message": "User created successfully"
}
```

**Errors:**
- 400: Missing required fields
- 400: User already exists
- 500: Registration failed

---

### POST /api/auth/login
Authenticate user and create session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_type": "recruiter",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true
  },
  "orgMember": {
    "org_id": "uuid",
    "user_id": "uuid",
    "role": "org_admin"
  }
}
```

**Errors:**
- 401: Invalid credentials
- 401: Account is inactive
- 500: Login failed

---

### GET /api/auth/me
Get current authenticated user session.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_type": "applicant",
    "first_name": "Jane",
    "last_name": "Smith",
    "profile_picture_url": null,
    "is_active": true
  },
  "orgMember": null
}
```

**Errors:**
- 401: Not authenticated
- 401: Invalid token
- 500: Session check failed

---

### POST /api/auth/logout
Clear user session and logout.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## Organization Endpoints

### POST /api/orgs
Create a new organization.

**Request:**
```json
{
  "name": "Tech Company Inc",
  "plan_type": "professional"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Tech Company Inc",
  "plan_type": "professional",
  "status": "active",
  "created_by": "uuid",
  "created_at": "2026-05-06T10:00:00Z"
}
```

**Authentication:** Required
**Errors:**
- 400: Organization name required
- 500: Failed to create organization

---

### GET /api/orgs
List all organizations the user belongs to.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Tech Company Inc",
    "plan_type": "professional",
    "status": "active",
    "created_by": "uuid",
    "created_at": "2026-05-06T10:00:00Z"
  }
]
```

**Authentication:** Required

---

### GET /api/orgs/:orgId/members
List all members in an organization.

**Response:**
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "user_id": "uuid",
    "role": "org_admin",
    "joined_at": "2026-05-06T10:00:00Z",
    "email": "admin@company.com",
    "first_name": "John",
    "last_name": "Admin"
  }
]
```

**Authentication:** Required (must be org member)

---

### POST /api/orgs/:orgId/members
Add a new member to organization.

**Request:**
```json
{
  "email": "recruiter@company.com",
  "role": "recruiter" | "hiring_manager" | "org_admin"
}
```

**Response:**
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "user_id": "uuid",
  "role": "recruiter"
}
```

**Authentication:** Required (must be org admin)
**Errors:**
- 403: Only org admins can add members
- 400: Email and role required

---

### PATCH /api/orgs/:orgId/members
Update a member's role.

**Request:**
```json
{
  "userId": "uuid",
  "role": "hiring_manager"
}
```

**Response:**
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "user_id": "uuid",
  "role": "hiring_manager"
}
```

**Authentication:** Required (must be org admin)

---

### DELETE /api/orgs/:orgId/members
Remove a member from organization.

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "message": "Member removed"
}
```

**Authentication:** Required (must be org admin)

---

## Job Endpoints

### GET /api/orgs/:orgId/jobs
List all jobs for an organization.

**Query Parameters:**
- `status`: Filter by status (open, closed, draft)
- `limit`: Number of results (default 50)
- `offset`: Pagination offset (default 0)

**Response:**
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "title": "Senior Developer",
    "description": "We are looking for...",
    "location": "Remote",
    "department": "Engineering",
    "closing_date": "2026-06-30",
    "custom_fields": {
      "years_experience": "required",
      "tech_stack": "optional"
    },
    "status": "open",
    "is_active": true,
    "created_by": "uuid",
    "created_at": "2026-05-06T10:00:00Z"
  }
]
```

**Authentication:** Optional (public read for open jobs, org members see all)

---

### POST /api/orgs/:orgId/jobs
Create a new job posting.

**Request:**
```json
{
  "title": "Senior Developer",
  "description": "We are looking for...",
  "location": "Remote",
  "department": "Engineering",
  "job_type": "full-time",
  "closing_date": "2026-06-30",
  "custom_fields": {
    "years_experience": {
      "type": "number",
      "required": true
    },
    "tech_stack": {
      "type": "text",
      "required": false
    }
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "title": "Senior Developer",
  "... ": "..."
}
```

**Authentication:** Required (must be org member)
**Note:** Default pipeline stages created automatically

---

## Candidate Pipeline Endpoints

### GET /api/jobs/:jobId/candidates
Get all candidates in pipeline for a job.

**Query Parameters:**
- `stage_id`: Filter by pipeline stage
- `min_score`: Filter by minimum match score
- `limit`: Number of results (default 50)

**Response:**
```json
[
  {
    "id": "uuid",
    "applicant_id": "uuid",
    "job_id": "uuid",
    "current_stage_id": "uuid",
    "match_score": 85.5,
    "ranking": 1,
    "notes": "Strong technical background...",
    "moved_at": "2026-05-05T14:30:00Z",
    "created_at": "2026-05-01T10:00:00Z",
    "updated_at": "2026-05-05T14:30:00Z",
    "email": "candidate@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "stage_name": "Interview",
    "summary": "Senior developer with 8 years experience...",
    "skills": ["Python", "React", "PostgreSQL"]
  }
]
```

**Authentication:** Required (must be org member)

---

### PATCH /api/jobs/:jobId/candidates
Update candidate in pipeline (move stage, add notes, update score).

**Request:**
```json
{
  "candidateId": "uuid",
  "currentStageId": "uuid",
  "matchScore": 90.0,
  "ranking": 2,
  "notes": "Passed first round interview, scheduling second round"
}
```

**Response:**
```json
{
  "id": "uuid",
  "... ": "...",
  "moved_at": "2026-05-06T16:00:00Z",
  "updated_at": "2026-05-06T16:00:00Z"
}
```

**Authentication:** Required (must be org member)

---

## Applicant Profile Endpoints

### GET /api/users/:userId/profile
Get applicant profile.

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "summary": "Experienced software engineer...",
  "skills": ["Python", "Go", "Kubernetes"],
  "portfolio_links": [
    "https://github.com/user",
    "https://user.dev"
  ],
  "preferred_job_type": "Remote",
  "preferred_locations": ["San Francisco", "New York", "Remote"],
  "created_at": "2026-05-01T10:00:00Z",
  "updated_at": "2026-05-05T14:30:00Z"
}
```

**Authentication:** Required

---

### PATCH /api/users/:userId/profile
Update applicant profile.

**Request:**
```json
{
  "summary": "Updated summary...",
  "skills": ["Python", "Go", "Kubernetes", "Docker"],
  "portfolio_links": ["https://github.com/user"],
  "preferred_job_type": "Full-time",
  "preferred_locations": ["Remote"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "... ": "..."
}
```

**Authentication:** Required (must be own profile or admin)

---

## Communications Endpoints

### GET /api/communications/templates/:orgId
Get email templates for organization.

**Response:**
```json
[
  {
    "name": "Welcome",
    "subject": "Welcome to {company}",
    "body": "Hi {firstName},\n\nWelcome to {company}!..."
  },
  {
    "name": "Interview Invite",
    "subject": "Interview Invitation - {jobTitle}",
    "body": "Hi {firstName},\n\nWe'd like to invite you..."
  }
]
```

**Authentication:** Required (must be org member)

---

### POST /api/communications/templates/:orgId
Send communication (email) to candidate.

**Request:**
```json
{
  "recipient_email": "candidate@example.com",
  "template_type": "interview_invite",
  "job_id": "uuid",
  "candidate_id": "uuid",
  "subject": "Interview Invitation - Senior Developer",
  "body": "Hi Jane,\n\nWe'd like to invite you for an interview..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "recipient_email": "candidate@example.com",
  "template_type": "interview_invite",
  "status": "pending",
  "sent_at": null,
  "created_at": "2026-05-06T16:00:00Z"
}
```

**Authentication:** Required (must be org member)
**Note:** In production, would actually send email via service

---

## Analytics Endpoints

### GET /api/orgs/:orgId/analytics
Get organization-level analytics and metrics.

**Response:**
```json
{
  "jobs": {
    "total_jobs": 12,
    "open_jobs": 8,
    "closed_jobs": 4
  },
  "applications": {
    "total_applications": 145,
    "new_applications": 23,
    "reviewed_applications": 85,
    "rejected_applications": 37
  },
  "pipeline": {
    "total_in_pipeline": 42,
    "avg_match_score": 78.5,
    "high_quality_candidates": 18
  },
  "stage_distribution": [
    {
      "stage_name": "Screening",
      "count": 15
    },
    {
      "stage_name": "Interview",
      "count": 18
    },
    {
      "stage_name": "Offer",
      "count": 7
    },
    {
      "stage_name": "Hired",
      "count": 2
    }
  ]
}
```

**Authentication:** Required (must be org member)

---

## Error Handling

All endpoints follow consistent error format:

```json
{
  "error": "Error message description",
  "details": "Optional detailed error information"
}
```

### HTTP Status Codes
- `200`: Successful GET/PATCH
- `201`: Successful POST (created)
- `400`: Bad request (validation error)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (not permitted)
- `404`: Not found
- `405`: Method not allowed
- `500`: Server error

---

## Authentication Flow

1. **Sign Up**
   ```
   POST /api/auth/register → Set auth_token cookie
   ```

2. **Login**
   ```
   POST /api/auth/login → Set auth_token cookie
   ```

3. **Check Session**
   ```
   GET /api/auth/me → Returns current user (cookie validated)
   ```

4. **Subsequent Requests**
   ```
   All endpoints → auth_token cookie automatically sent with requests
   ```

5. **Logout**
   ```
   POST /api/auth/logout → Clear auth_token cookie
   ```

---

## Rate Limiting & Pagination

**Pagination** (future implementation):
- `limit`: Max 100 (default 50)
- `offset`: For pagination (default 0)

**Rate Limiting** (future implementation):
- 100 requests per minute per user
- 1000 requests per hour per org

---

## Webhooks & Integrations

Future endpoints for external integrations:

```
POST /api/webhooks/candidate-scored
POST /api/webhooks/job-applied
POST /api/webhooks/interview-scheduled
```

---

**Last Updated:** May 2026
**API Version:** 1.0
