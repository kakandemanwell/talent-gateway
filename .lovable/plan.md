## Phase 1: UI Shell + Key Screens (Mock Data)

We'll build the full navigation, layouts, and key screens for all three roles using hardcoded sample data so you can validate the UX before we wire Lovable Cloud (auth, DB, RBAC) in Phase 2. The existing Jobs portal and application form stay intact and get folded into the new Applicant experience.

### Design System

- Refresh `src/index.css` + `tailwind.config.ts` with semantic tokens: neutral palette (slate/zinc base) + a single strong primary accent (indigo/violet), soft shadows, `--radius: 0.75rem`.
- Reusable primitives already available via shadcn (Card, Badge, Button, Tabs, Dialog, Sheet, Sidebar, Table, DropdownMenu).
- New shared components: `StatCard`, `PageHeader`, `EmptyState`, `RoleSwitcher` (dev helper to jump between portals while there's no auth), `MatchScoreBadge`.

### Routing & Layout

```
/                          Landing page (marketing)
/auth/login, /auth/signup  Auth screens (UI only)

/app                       Authenticated shell with sidebar + topbar
  /applicant/dashboard
  /applicant/jobs          (existing Jobs list, restyled)
  /applicant/jobs/:id      (existing JobDetail)
  /applicant/apply/:id     (existing form)
  /applicant/applications
  /applicant/profile

  /org/dashboard           Org analytics
  /org/jobs                Job listings (recruiter view)
  /org/jobs/new            Job creation wizard
  /org/pipeline/:jobId     Kanban pipeline
  /org/candidates/:id      Candidate detail
  /org/team                Team & roles
  /org/settings            Org settings
  /org/messaging           Templates & bulk messages

  /admin/dashboard         SaaS admin global dashboard
  /admin/organizations     Org management (verify/suspend)
  /admin/analytics         Platform analytics
```

A persistent `RoleSwitcher` in the topbar lets you preview Applicant / Recruiter / SaaS Admin without auth.

### Screens (Phase 1)

**Marketing & Auth**
1. Landing page — hero, value props (3 cards: For Recruiters / For Applicants / For Admins), feature grid, CTA.
2. Login + Signup (UI only, role select on signup).

**Applicant Portal**
3. Dashboard — profile completion ring, applications by status, recommended jobs.
4. Jobs list (reuse) + Job detail (reuse) + Apply flow (reuse, prefilled from mock profile).
5. My Applications — table with stage badges + timeline drawer.
6. Profile — sections: personal, skills, experience, education, portfolio, CV upload toggle.

**Recruiter / Org Admin Portal**
7. Org Dashboard — KPI cards (open jobs, candidates, time-to-hire, offer rate), funnel chart, applications-per-job bar chart (recharts).
8. Jobs list — table with status, applicants count, stage breakdown, actions.
9. Job creation wizard — 3 steps: Basics → Requirements & custom fields (text / multi-choice / file) → Review & Publish.
10. Pipeline (Kanban) — columns: Applied, Longlist, Shortlist, Interview, Assessment, Offer, Rejected. Drag-and-drop with `@dnd-kit/core`. Candidate cards show name, score badge, key tags. Bulk-select toolbar.
11. Candidate detail — profile, score breakdown (mock), stage history, comments, action bar (move stage, reject, message).
12. Team management — members table with role select, invite dialog.
13. Org settings — org profile, branding, custom stages config.
14. Messaging — template list + editor, bulk send dialog tied to a stage.

**SaaS Admin Portal**
15. Global dashboard — orgs / users / jobs / applications KPIs + growth line chart.
16. Organizations — table with verify / suspend / view actions.
17. Platform analytics — engagement, success rate, usage trends.

### Mock Data Layer

`src/data/` will hold typed fixtures:
- `organizations.ts`, `teams.ts`, `users.ts` (with roles)
- `jobs.ts` (extend existing with industry, customFields, status)
- `candidates.ts` (with score, stage, attributes)
- `applications.ts`, `pipelineStages.ts`, `messageTemplates.ts`, `analytics.ts`

A tiny `src/store/roleStore.ts` (zustand or React context) tracks the active role for the RoleSwitcher.

### External-API Integration Points (visual only)

- `MatchScoreBadge` everywhere a score appears, with a tooltip "Provided by scoring API".
- "Insights" badges on candidate cards.
- A disabled "Re-run matching" button on the pipeline header.

### Out of Scope for Phase 1 (queued for Phase 2)

- Lovable Cloud: auth, RLS, `user_roles` table, multi-tenant org_id scoping, real persistence.
- Real email sending, file storage, scoring API calls.
- The existing Supabase migrations stay untouched in this phase.

### Deliverables

- ~17 new/refreshed pages, shared layout with sidebar + topbar + role switcher.
- Updated design tokens.
- Mock data fixtures.
- Existing `/jobs`, `/jobs/:id`, `/apply/:jobId` routes preserved as redirects into the new applicant routes.

After you approve, I'll implement this in default mode. Given the size, expect this to land as one large change — we can then iterate per-screen.