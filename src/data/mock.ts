// Centralized mock data for the recruitment SaaS UI shell.

export type Role = "applicant" | "recruiter" | "admin";

export interface Organization {
  id: string;
  name: string;
  industry: string;
  status: "active" | "pending" | "suspended";
  members: number;
  jobs: number;
  applications: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Org Admin" | "Hiring Manager" | "Recruiter";
  avatar?: string;
  active: boolean;
}

export type PipelineStage =
  | "Applied"
  | "Longlist"
  | "Shortlist"
  | "Interview"
  | "Assessment"
  | "Offer"
  | "Rejected";

export const PIPELINE_STAGES: PipelineStage[] = [
  "Applied",
  "Longlist",
  "Shortlist",
  "Interview",
  "Assessment",
  "Offer",
  "Rejected",
];

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  title: string;
  location: string;
  score: number; // 0-100
  stage: PipelineStage;
  skills: string[];
  experienceYears: number;
  appliedAt: string;
  insights: string[];
}

export interface JobListing {
  id: string;
  title: string;
  organization: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote";
  industry: string;
  salary: string;
  postedAt: string;
  closingDate: string;
  status: "Open" | "Draft" | "Closed";
  applicants: number;
  description: string;
  requirements: string[];
  responsibilities: string[];
  customFields?: { id: string; label: string; type: "text" | "choice" | "file"; options?: string[] }[];
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  organization: string;
  appliedAt: string;
  stage: PipelineStage;
  score: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  trigger: PipelineStage | "Manual";
  subject: string;
  body: string;
}

// ---------- Organizations ----------
export const organizations: Organization[] = [
  { id: "org-1", name: "Acme Talent Group", industry: "Recruitment", status: "active", members: 24, jobs: 12, applications: 348, createdAt: "2025-08-12" },
  { id: "org-2", name: "Veridian Health", industry: "Healthcare", status: "active", members: 18, jobs: 7, applications: 192, createdAt: "2025-09-03" },
  { id: "org-3", name: "Northwind AgriTech", industry: "Agriculture", status: "pending", members: 6, jobs: 2, applications: 41, createdAt: "2026-04-22" },
  { id: "org-4", name: "Helios Finance", industry: "Finance", status: "active", members: 31, jobs: 9, applications: 276, createdAt: "2025-06-19" },
  { id: "org-5", name: "Quantum Robotics", industry: "Engineering", status: "suspended", members: 11, jobs: 0, applications: 88, createdAt: "2025-11-02" },
];

// ---------- Team ----------
export const teamMembers: TeamMember[] = [
  { id: "u-1", name: "Amara Okafor", email: "amara@acme.com", role: "Org Admin", active: true },
  { id: "u-2", name: "Liam Bennett", email: "liam@acme.com", role: "Recruiter", active: true },
  { id: "u-3", name: "Priya Shah", email: "priya@acme.com", role: "Hiring Manager", active: true },
  { id: "u-4", name: "Diego Alvarez", email: "diego@acme.com", role: "Recruiter", active: true },
  { id: "u-5", name: "Mei Tanaka", email: "mei@acme.com", role: "Hiring Manager", active: false },
];

// ---------- Jobs ----------
export const jobListings: JobListing[] = [
  {
    id: "job-001",
    title: "Senior Software Engineer",
    organization: "Acme Talent Group",
    department: "Engineering",
    location: "Cape Town, South Africa",
    type: "Full-time",
    industry: "Engineering",
    salary: "R850,000 – R1,200,000",
    postedAt: "2026-02-20",
    closingDate: "2026-06-15",
    status: "Open",
    applicants: 84,
    description: "Lead the development of our core platform services and mentor a team of engineers shipping at scale.",
    requirements: ["5+ years professional experience", "TypeScript / Go / Python", "Distributed systems", "Cloud (AWS, GCP)"],
    responsibilities: ["Design scalable backend services", "Mentor engineers", "Drive technical roadmap"],
  },
  {
    id: "job-002",
    title: "Product Designer",
    organization: "Acme Talent Group",
    department: "Design",
    location: "Johannesburg, South Africa",
    type: "Full-time",
    industry: "Design",
    salary: "R550,000 – R750,000",
    postedAt: "2026-03-01",
    closingDate: "2026-06-30",
    status: "Open",
    applicants: 51,
    description: "Own end-to-end product design for our flagship recruiter workspace.",
    requirements: ["3+ years product design", "Figma mastery", "Design systems"],
    responsibilities: ["Design flows", "Run usability tests", "Maintain design system"],
  },
  {
    id: "job-003",
    title: "Data Analyst",
    organization: "Helios Finance",
    department: "Analytics",
    location: "Remote",
    type: "Remote",
    industry: "Finance",
    salary: "R450,000 – R650,000",
    postedAt: "2026-03-05",
    closingDate: "2026-07-10",
    status: "Open",
    applicants: 37,
    description: "Turn financial data into clear, actionable dashboards used by leadership.",
    requirements: ["SQL", "Python or R", "BI tools"],
    responsibilities: ["Build dashboards", "Define KPIs", "Run A/B analyses"],
  },
  {
    id: "job-004",
    title: "Field Operations Lead",
    organization: "Northwind AgriTech",
    department: "Operations",
    location: "Nairobi, Kenya",
    type: "Full-time",
    industry: "Agriculture",
    salary: "KES 3.6M – 4.8M",
    postedAt: "2026-03-08",
    closingDate: "2026-06-20",
    status: "Open",
    applicants: 22,
    description: "Coordinate field teams across three regions to scale our smallholder programmes.",
    requirements: ["4+ years operations leadership", "Agritech exposure", "Swahili a plus"],
    responsibilities: ["Manage 3 regional leads", "Own KPI delivery", "Quarterly planning"],
  },
  {
    id: "job-005",
    title: "Clinical Nurse Specialist",
    organization: "Veridian Health",
    department: "Clinical",
    location: "Pretoria, South Africa",
    type: "Full-time",
    industry: "Healthcare",
    salary: "R480,000 – R620,000",
    postedAt: "2026-03-12",
    closingDate: "2026-06-25",
    status: "Open",
    applicants: 16,
    description: "Provide specialist clinical care and supervise junior nursing staff.",
    requirements: ["Registered Nurse", "5+ years clinical experience", "Specialist certification"],
    responsibilities: ["Patient care", "Staff supervision", "Quality assurance"],
  },
];

// ---------- Candidates ----------
const firstNames = ["Sipho", "Naledi", "Tariq", "Zanele", "Kabelo", "Aisha", "Ethan", "Nia", "Ravi", "Yusuf", "Lerato", "Owen", "Chiamaka", "Hana", "Marcus"];
const lastNames = ["Mthembu", "Dlamini", "Patel", "Naidoo", "Kgomo", "Hassan", "Pretorius", "Adeyemi", "Sharma", "Khan", "Williams", "Mokoena", "Eze", "Tanaka", "Cole"];
const skillsPool = ["React", "TypeScript", "Python", "SQL", "Figma", "AWS", "Leadership", "Stakeholder Mgmt", "GraphQL", "Tailwind", "Power BI", "User Research"];

function pick<T>(arr: T[], n: number): T[] {
  const c = [...arr].sort(() => Math.random() - 0.5);
  return c.slice(0, n);
}

export const candidates: Candidate[] = Array.from({ length: 28 }).map((_, i) => {
  const job = jobListings[i % jobListings.length];
  const stage = PIPELINE_STAGES[i % PIPELINE_STAGES.length];
  const fn = firstNames[i % firstNames.length];
  const ln = lastNames[(i * 3) % lastNames.length];
  return {
    id: `cand-${i + 1}`,
    jobId: job.id,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@email.com`,
    title: job.title,
    location: job.location,
    score: 55 + ((i * 7) % 45),
    stage,
    skills: pick(skillsPool, 4),
    experienceYears: 1 + (i % 12),
    appliedAt: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`,
    insights: ["Strong portfolio", "Top 10% match", "Local candidate"].slice(0, 1 + (i % 3)),
  };
});

// ---------- My applications (applicant view) ----------
export const myApplications: ApplicationRecord[] = jobListings.slice(0, 4).map((j, i) => ({
  id: `app-${i + 1}`,
  jobId: j.id,
  jobTitle: j.title,
  organization: j.organization,
  appliedAt: `2026-04-${String(10 + i).padStart(2, "0")}`,
  stage: PIPELINE_STAGES[i % PIPELINE_STAGES.length],
  score: 70 + i * 5,
}));

// ---------- Message templates ----------
export const messageTemplates: MessageTemplate[] = [
  { id: "t-1", name: "Interview invite", trigger: "Interview", subject: "You're invited to interview", body: "Hi {{name}},\n\nWe'd love to invite you to an interview for the {{job}} role." },
  { id: "t-2", name: "Shortlist notification", trigger: "Shortlist", subject: "You've been shortlisted", body: "Hi {{name}}, congrats — you've been shortlisted for {{job}}." },
  { id: "t-3", name: "Polite rejection", trigger: "Rejected", subject: "Update on your application", body: "Hi {{name}}, thank you for applying. We've decided to move forward with other candidates." },
];

// ---------- Analytics ----------
export const orgAnalytics = {
  kpis: { openJobs: 12, candidates: 348, timeToHire: 21, offerRate: 14 },
  funnel: PIPELINE_STAGES.filter((s) => s !== "Rejected").map((stage, i) => ({
    stage,
    count: Math.round(348 * Math.pow(0.62, i)),
  })),
  applicationsPerJob: jobListings.map((j) => ({ name: j.title.split(" ").slice(0, 2).join(" "), value: j.applicants })),
  trend: Array.from({ length: 8 }).map((_, i) => ({
    week: `W${i + 1}`,
    applications: 30 + Math.round(Math.sin(i) * 12) + i * 4,
    hires: 1 + (i % 4),
  })),
};

export const platformAnalytics = {
  kpis: { organizations: 142, users: 1840, jobs: 312, applications: 9420 },
  growth: Array.from({ length: 12 }).map((_, i) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    orgs: 60 + i * 7,
    apps: 1200 + i * 380,
  })),
};

// ---------- Applicant profile ----------
export const applicantProfile = {
  name: "Alex Morgan",
  email: "alex.morgan@email.com",
  phone: "+27 82 555 0199",
  location: "Cape Town, South Africa",
  headline: "Senior Frontend Engineer",
  completion: 78,
  skills: ["React", "TypeScript", "Tailwind", "Node.js", "GraphQL"],
  experience: [
    { role: "Frontend Lead", company: "Bright Labs", years: "2023 – Present" },
    { role: "Senior Engineer", company: "Pixel & Co", years: "2020 – 2023" },
  ],
  education: [{ qualification: "BSc Computer Science", school: "UCT", year: 2019 }],
  portfolio: ["github.com/alexm", "alexmorgan.dev"],
};
