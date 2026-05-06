# External Integrations Guide

This document outlines integration points for external services that can enhance the recruitment platform with AI capabilities, advanced matching, and third-party services.

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Recruitment Platform API                   │
│  (Candidate data, job requirements, pipeline events)    │
└──────────────────┬──────────────────────────────────────┘
                   │ Webhook/API calls
        ┌──────────┼──────────┬──────────────┐
        ▼          ▼          ▼              ▼
    ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
    │ Resume │ │ Skill  │ │Interview │ │Background│
    │ Parser │ │Matcher │ │Scheduler │ │ Check    │
    └────────┘ └────────┘ └──────────┘ └──────────┘
```

---

## Candidate Matching & Scoring

### Use Case
Automatically score candidates against job requirements using ML/AI.

### Integration Points
- **Trigger**: When candidate applies or profile is updated
- **Input**: Candidate profile, job description, custom fields
- **Output**: Match score (0-100), key strengths, recommendations
- **Display**: Badge on candidate card, Kanban visualization

### Implementation Example

**API Endpoint:**
```typescript
// api/integrations/match-score.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { candidateId, jobId } = req.body;

    // Get candidate profile
    const candidate = await sql`
      SELECT * FROM applicant_profiles WHERE user_id = ${candidateId}
    `;

    // Get job details
    const job = await sql`
      SELECT * FROM jobs WHERE id = ${jobId}
    `;

    // Call external scoring API
    const scoreResponse = await fetch(
      'https://api.externalscoringservice.com/score',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SCORING_API_KEY}`,
        },
        body: JSON.stringify({
          candidate: candidate[0],
          job: job[0],
        }),
      }
    );

    const { score, strengths, gaps } = await scoreResponse.json();

    // Save score to database
    await sql`
      UPDATE candidates_in_pipeline
      SET match_score = ${score}
      WHERE applicant_id = ${candidateId} AND job_id = ${jobId}
    `;

    return res.status(200).json({
      match_score: score,
      strengths,
      gaps,
      recommendation: score >= 80 ? 'strong_match' : 'review_required',
    });
  } catch (error) {
    console.error('Scoring error:', error);
    return res.status(500).json({ error: 'Scoring failed' });
  }
}
```

**Frontend Usage:**
```typescript
// In KanbanPipeline component or candidate detail page
const [matchScore, setMatchScore] = useState<number | null>(null);

useEffect(() => {
  const fetchScore = async () => {
    const res = await fetch('/api/integrations/match-score', {
      method: 'POST',
      body: JSON.stringify({ candidateId, jobId }),
    });
    const { match_score } = await res.json();
    setMatchScore(match_score);
  };

  fetchScore();
}, [candidateId, jobId]);
```

### Recommended Services
- **OpenAI API**: GPT-4 based skill matching
- **LinkedIn Talent Solutions**: Verified candidate data
- **Lever API**: Candidate scoring
- **Ideal**: AI-powered candidate screening
- **Pymetrics**: Skills assessment integration

---

## Resume Parsing

### Use Case
Extract structured data from CV/resume uploads for automatic profile filling.

### Integration Points
- **Trigger**: When user uploads CV in profile or job application
- **Input**: PDF/DOC file
- **Output**: Extracted name, experience, education, skills
- **Action**: Auto-populate applicant profile fields

### Implementation Example

**Frontend Upload Handler:**
```typescript
// In ApplicantProfile.tsx
const handleCVUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', user?.id);

  const res = await fetch('/api/integrations/parse-resume', {
    method: 'POST',
    body: formData,
  });

  if (res.ok) {
    const { skills, experience, education, summary } = await res.json();
    setProfile(prev => ({
      ...prev,
      skills: [...(prev.skills || []), ...skills],
      summary: summary || prev.summary,
    }));
  }
};

return (
  <input
    type="file"
    accept=".pdf,.doc,.docx"
    onChange={(e) => e.target.files?.[0] && handleCVUpload(e.target.files[0])}
  />
);
```

**Backend API:**
```typescript
// api/integrations/parse-resume.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    const file = req.files?.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to Vercel Blob
    const blobUrl = await put(`cvs/${userId}/${file.name}`, file, {
      access: 'private',
    });

    // Call resume parsing service
    const parseResponse = await fetch(
      'https://api.externalparsing.com/parse',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PARSING_API_KEY}`,
        },
        body: JSON.stringify({
          file_url: blobUrl,
        }),
      }
    );

    const { skills, experience, education, name, summary } =
      await parseResponse.json();

    // Update profile
    await sql`
      UPDATE applicant_profiles
      SET skills = ${JSON.stringify(skills)}, 
          summary = ${summary || null}
      WHERE user_id = ${userId}
    `;

    return res.status(200).json({
      skills,
      experience,
      education,
      name,
      summary,
      blob_url: blobUrl,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return res.status(500).json({ error: 'Parsing failed' });
  }
}
```

### Recommended Services
- **Pyresparser**: Free, open-source resume parsing
- **Affinda API**: Commercial resume parsing
- **Eden AI**: Multi-provider parsing API
- **Adobe PDF Services**: Document parsing
- **AWS Textract**: AWS's document extraction

---

## Interview Scheduling

### Use Case
Automatically schedule interviews with candidates and send calendar invites.

### Integration Points
- **Trigger**: Recruiter clicks "Schedule Interview"
- **Input**: Candidate email, job title, preferred dates
- **Output**: Calendar invite sent, meeting created
- **Display**: Interview scheduled in pipeline

### Implementation Example

```typescript
// api/integrations/schedule-interview.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      candidateEmail,
      recruiterEmail,
      jobTitle,
      scheduledTime,
      meetingLink,
    } = req.body;

    // Call calendar service API
    const calendarResponse = await fetch(
      'https://api.calendlyapi.com/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Interview - ${jobTitle}`,
          description: `Interview with ${candidateEmail}`,
          start_time: scheduledTime,
          end_time: new Date(new Date(scheduledTime).getTime() + 60 * 60000),
          invitees: [
            { email: candidateEmail },
            { email: recruiterEmail },
          ],
          meeting_link: meetingLink,
        }),
      }
    );

    const { event_id } = await calendarResponse.json();

    // Send email notification
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: candidateEmail }],
            subject: `Interview Scheduled - ${jobTitle}`,
          },
        ],
        from: { email: 'recruiting@company.com' },
        content: [
          {
            type: 'text/html',
            value: `<p>Your interview is scheduled for ${new Date(scheduledTime).toLocaleString()}</p>`,
          },
        ],
      }),
    });

    return res.status(200).json({
      event_id,
      scheduled_time: scheduledTime,
      meeting_link: meetingLink,
    });
  } catch (error) {
    console.error('Scheduling error:', error);
    return res.status(500).json({ error: 'Scheduling failed' });
  }
}
```

### Recommended Services
- **Calendly**: Interview scheduling
- **Sendgrid**: Email notifications
- **Zoom API**: Video interview setup
- **Google Calendar API**: Calendar integration
- **Outlook API**: Microsoft calendar integration

---

## Background Checks

### Use Case
Initiate background checks when candidate receives offer.

### Integration Points
- **Trigger**: Offer sent to candidate
- **Input**: Candidate name, email, job title
- **Output**: Check status, results
- **Display**: Status badge in candidate details

### Implementation Example

```typescript
// api/integrations/background-check.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { candidateId, candidateName, candidateEmail, jobTitle } = req.body;

    // Initiate background check via external service
    const checkResponse = await fetch(
      'https://api.backgroundcheckservice.com/checks',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.BACKGROUND_CHECK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: candidateName,
          email: candidateEmail,
          position: jobTitle,
          check_type: 'standard', // standard, comprehensive, etc
        }),
      }
    );

    const { check_id, status } = await checkResponse.json();

    // Store check record
    await sql`
      INSERT INTO background_checks (candidate_id, check_id, status, initiated_at)
      VALUES (${candidateId}, ${check_id}, ${status}, now())
    `;

    return res.status(200).json({
      check_id,
      status,
      initiated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Background check error:', error);
    return res.status(500).json({ error: 'Check initiation failed' });
  }
}
```

### Recommended Services
- **Checkr**: Background check platform
- **Sterling**: Enterprise background checks
- **Clarity Services**: Background screening
- **HireRight**: Background verification
- **GoodHire**: Compliance background checks

---

## Email Communication

### Use Case
Send bulk emails to candidates with templates and tracking.

### Current Implementation
`/api/communications/templates.ts` - Email template management

### Enhancement with Third-Party Service

```typescript
// api/communications/send-bulk.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orgId, candidateIds, templateId, jobId } = req.body;

    // Get candidates
    const candidates = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      WHERE u.id = ANY(${candidateIds})
    `;

    // Prepare emails for bulk sending
    const emails = candidates.map(candidate => ({
      to: candidate.email,
      subject: 'Update on your application',
      html: `<p>Hi ${candidate.first_name},</p><p>We have an update...</p>`,
      metadata: {
        candidate_id: candidate.id,
        job_id: jobId,
        template_id: templateId,
      },
    }));

    // Send via email service
    const sendResponse = await fetch(
      'https://api.sendgrid.com/v3/mail/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: emails.map(email => ({
            to: [{ email: email.to }],
            subject: email.subject,
            custom_args: email.metadata,
          })),
          from: { email: 'recruiting@company.com' },
          content: [
            {
              type: 'text/html',
              value: emails[0].html,
            },
          ],
        }),
      }
    );

    // Log communications
    for (const candidate of candidates) {
      await sql`
        INSERT INTO communications (
          organization_id, recipient_email, template_type,
          job_id, candidate_id, subject, body, status, sent_at
        )
        VALUES (
          ${orgId}, ${candidate.email}, ${templateId},
          ${jobId}, ${candidate.id}, 'Bulk update', 'Email sent', 'sent', now()
        )
      `;
    }

    return res.status(200).json({
      sent_count: candidates.length,
      failed_count: 0,
    });
  } catch (error) {
    console.error('Bulk send error:', error);
    return res.status(500).json({ error: 'Send failed' });
  }
}
```

### Recommended Services
- **SendGrid**: Email delivery and analytics
- **Mailgun**: Email API platform
- **Twilio**: SMS + Email
- **Braze**: Customer engagement
- **HubSpot**: Email marketing

---

## Job Board Posting

### Use Case
Automatically post jobs to multiple job boards for wider reach.

### Implementation

```typescript
// api/integrations/post-to-boards.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.body;

    // Get job details
    const jobs = await sql`
      SELECT * FROM jobs WHERE id = ${jobId}
    `;

    const job = jobs[0];

    // Post to multiple boards
    const boards = ['linkedin', 'indeed', 'glassdoor', 'angel'];

    for (const board of boards) {
      if (process.env[`${board.toUpperCase()}_API_KEY`]) {
        await postToBoard(board, job);
      }
    }

    return res.status(200).json({
      posted_to: boards.length + ' boards',
      job_id: jobId,
    });
  } catch (error) {
    console.error('Board posting error:', error);
    return res.status(500).json({ error: 'Posting failed' });
  }
}

async function postToBoard(board: string, job: any) {
  const apiKey = process.env[`${board.toUpperCase()}_API_KEY`];

  const payload = {
    title: job.title,
    description: job.description,
    location: job.location,
    employment_type: job.job_type,
  };

  // API calls vary by board
  switch (board) {
    case 'linkedin':
      return fetch('https://api.linkedin.com/v2/jobs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    case 'indeed':
      return fetch('https://api.indeed.com/api/v3/jobs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  }
}
```

### Recommended Services
- **LinkedIn Jobs**: LinkedIn posting API
- **Indeed**: Indeed API
- **Greenhouse**: ATS job board posting
- **Lever**: ATS job board posting
- **Built.io**: Job board aggregation

---

## Setting Up Integrations

### 1. Get API Keys
Get API keys from each service and add to environment variables:
```
SCORING_API_KEY=...
PARSING_API_KEY=...
SENDGRID_API_KEY=...
BACKGROUND_CHECK_API_KEY=...
```

### 2. Create Integration Endpoint
Create new API route in `/api/integrations/[service].ts`

### 3. Test Endpoint
```bash
curl -X POST http://localhost:3000/api/integrations/match-score \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "uuid", "jobId": "uuid"}'
```

### 4. Integrate in UI
Add button or trigger in relevant component:
```typescript
<Button onClick={() => fetchScore(candidateId, jobId)}>
  Calculate Match Score
</Button>
```

### 5. Monitor & Log
Add logging and error handling:
```typescript
console.log(`[Integration] Calling ${service}...`);
// Log results, errors, latency
```

---

## Webhook Integration

For real-time updates from external services:

```typescript
// api/webhooks/[service].ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const signature = req.headers['x-signature'];
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Process webhook
    const { event_type, data } = req.body;

    switch (event_type) {
      case 'candidate_scored':
        await updateCandidateScore(data.candidate_id, data.score);
        break;
      case 'background_check_complete':
        await updateBackgroundCheckStatus(data);
        break;
      case 'interview_scheduled':
        await logInterviewScheduled(data);
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Processing failed' });
  }
}
```

---

## Best Practices

1. **API Key Management**
   - Store all keys in environment variables
   - Never commit keys to git
   - Rotate keys regularly

2. **Error Handling**
   - Wrap external API calls in try-catch
   - Log failures for debugging
   - Return user-friendly error messages

3. **Performance**
   - Use async/await for non-blocking calls
   - Cache expensive API responses
   - Consider rate limits

4. **Monitoring**
   - Track integration failures
   - Monitor API latency
   - Set up alerts for failures

5. **Testing**
   - Test with sandbox/test API keys
   - Mock external responses in tests
   - Document test cases

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Integration Points**: 6 major categories
