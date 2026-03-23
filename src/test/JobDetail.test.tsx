/**
 * Regression tests — JobDetail.tsx
 * Verifies skills bubble rendering and closing_date display.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Job } from "@/lib/jobService";

// ── Mock fetchJobById ─────────────────────────────────────────────────────────

vi.mock("@/lib/jobService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/jobService")>();
  return { ...actual, fetchJobById: vi.fn() };
});

import { fetchJobById } from "@/lib/jobService";
import JobDetail from "@/pages/JobDetail";

// ── Fixture ───────────────────────────────────────────────────────────────────

const jobWithSkills: Job = {
  id: "uuid-1",
  odoo_job_id: "OD-7",
  title: "Finance Manager",
  department: "Finance",
  location: "Nairobi",
  closing_date: "2026-04-30",
  description: "<p>Great role.</p>",
  is_active: true,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
  skills: [
    { name: "IFRS", type: "Accounting Standards" },
    { name: "Excel", type: "Computer Skills" },
    { name: "SAP", type: null },
  ],
  questions: [],
};

function renderJobDetail(jobId = "uuid-1") {
  return render(
    <MemoryRouter initialEntries={[`/jobs/${jobId}`]}>
      <Routes>
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/jobs" element={<div>Jobs list</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("JobDetail — skills bubbles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a badge for each skill", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithSkills);
    renderJobDetail();

    expect(await screen.findByText("IFRS")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(screen.getByText("SAP")).toBeInTheDocument();
  });

  it("renders the Required Skills heading when skills are present", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithSkills);
    renderJobDetail();

    expect(await screen.findByText("Required Skills")).toBeInTheDocument();
  });

  it("does NOT render Required Skills section when skills array is empty", async () => {
    vi.mocked(fetchJobById).mockResolvedValue({ ...jobWithSkills, skills: [] });
    renderJobDetail();

    // Wait for job title to confirm render is complete
    await screen.findByText("Finance Manager");
    expect(screen.queryByText("Required Skills")).not.toBeInTheDocument();
  });
});

describe("JobDetail — closing_date display", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows closing date when present", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithSkills);
    renderJobDetail();

    expect(await screen.findByText(/Closes 2026-04-30/)).toBeInTheDocument();
  });

  it("does not render the Closes label when closing_date is null", async () => {
    vi.mocked(fetchJobById).mockResolvedValue({ ...jobWithSkills, closing_date: null });
    renderJobDetail();

    await screen.findByText("Finance Manager");
    expect(screen.queryByText(/Closes/)).not.toBeInTheDocument();
  });
});

describe("JobDetail — gender neutrality", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not render any gender field or label", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithSkills);
    renderJobDetail();

    await screen.findByText("Finance Manager");
    expect(screen.queryByText(/gender/i)).not.toBeInTheDocument();
  });
});
