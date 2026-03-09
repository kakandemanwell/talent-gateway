export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote";
  salary: string;
  posted: string;
  closingDate: string;
  summary: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
}

export const jobs: Job[] = [
  {
    id: "job-001",
    title: "Senior Software Engineer",
    department: "Engineering",
    location: "Cape Town, South Africa",
    type: "Full-time",
    salary: "R850,000 – R1,200,000 per annum",
    posted: "2026-02-20",
    closingDate: "2026-04-15",
    summary: "We are looking for an experienced software engineer to lead development of our core platform services.",
    description: "Join our engineering team to architect, build, and scale high-performance backend systems. You will work closely with product and design to deliver features that impact millions of users.",
    requirements: [
      "5+ years of professional software development experience",
      "Proficiency in TypeScript, Python, or Go",
      "Experience with cloud platforms (AWS, GCP, or Azure)",
      "Strong understanding of distributed systems",
      "Bachelor's degree in Computer Science or related field",
    ],
    responsibilities: [
      "Design and implement scalable backend services",
      "Mentor junior engineers and conduct code reviews",
      "Collaborate with cross-functional teams on product roadmap",
      "Ensure system reliability through monitoring and incident response",
      "Contribute to engineering best practices and documentation",
    ],
  },
  {
    id: "job-002",
    title: "UX/UI Designer",
    department: "Design",
    location: "Johannesburg, South Africa",
    type: "Full-time",
    salary: "R550,000 – R750,000 per annum",
    posted: "2026-03-01",
    closingDate: "2026-04-30",
    summary: "Seeking a creative UX/UI designer to craft intuitive and visually compelling user experiences.",
    description: "You will own the end-to-end design process from user research and wireframing to high-fidelity prototypes and design system maintenance.",
    requirements: [
      "3+ years of UX/UI design experience",
      "Proficiency in Figma or Sketch",
      "Strong portfolio demonstrating user-centered design",
      "Understanding of accessibility standards",
      "Experience with design systems",
    ],
    responsibilities: [
      "Conduct user research and usability testing",
      "Create wireframes, prototypes, and high-fidelity designs",
      "Maintain and evolve the company design system",
      "Collaborate with engineers to ensure design fidelity",
      "Present design solutions to stakeholders",
    ],
  },
  {
    id: "job-003",
    title: "Data Analyst",
    department: "Analytics",
    location: "Remote",
    type: "Remote",
    salary: "R450,000 – R650,000 per annum",
    posted: "2026-03-05",
    closingDate: "2026-05-10",
    summary: "We need a data-driven analyst to uncover insights that drive strategic business decisions.",
    description: "Work with large datasets to identify trends, build dashboards, and deliver actionable insights to leadership and product teams.",
    requirements: [
      "2+ years of experience in data analysis",
      "Proficiency in SQL and Python or R",
      "Experience with BI tools (Tableau, Power BI, or Looker)",
      "Strong statistical and analytical skills",
      "Excellent communication and presentation skills",
    ],
    responsibilities: [
      "Analyze business data to identify trends and opportunities",
      "Build and maintain dashboards and automated reports",
      "Partner with product teams to define and track KPIs",
      "Perform A/B test analysis and deliver recommendations",
      "Ensure data quality and integrity across pipelines",
    ],
  },
  {
    id: "job-004",
    title: "Marketing Coordinator",
    department: "Marketing",
    location: "Durban, South Africa",
    type: "Part-time",
    salary: "R280,000 – R380,000 per annum",
    posted: "2026-03-08",
    closingDate: "2026-04-20",
    summary: "Looking for a proactive marketing coordinator to support campaigns and brand initiatives.",
    description: "Support the marketing team in planning and executing digital and offline campaigns. You will manage social media, coordinate events, and track campaign performance.",
    requirements: [
      "1+ years of marketing experience",
      "Familiarity with social media platforms and analytics",
      "Strong writing and communication skills",
      "Experience with email marketing tools",
      "Bachelor's degree in Marketing or related field",
    ],
    responsibilities: [
      "Coordinate marketing campaigns across channels",
      "Manage social media content calendar",
      "Track and report on campaign performance metrics",
      "Assist with event planning and execution",
      "Support content creation for blog and newsletter",
    ],
  },
];
