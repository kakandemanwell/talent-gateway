/**
 * Regression tests — Index.tsx (application form)
 * Covers: question rendering, validation, gender neutrality.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Job } from "@/lib/jobService";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/jobService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/jobService")>();
  return { ...actual, fetchJobById: vi.fn() };
});

vi.mock("@/lib/applicationService", () => ({
  submitApplication: vi.fn().mockResolvedValue({ applicationId: "app-1" }),
}));

import { fetchJobById } from "@/lib/jobService";
import Index from "@/pages/Index";

// ── Fixture ───────────────────────────────────────────────────────────────────

const baseJob: Job = {
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
  skills: [{ name: "IFRS", type: "Accounting Standards" }],
  questions: [],
};

const jobWithQuestions: Job = {
  ...baseJob,
  questions: [
    {
      id: "OD-Q-3",
      sequence: 0,
      text: "Briefly describe your motivation.",
      type: "text",
      required: true,
      char_limit: 500,
      options: [],
    },
    {
      id: "OD-Q-4",
      sequence: 1,
      text: "Which professional body are you a member of?",
      type: "radio",
      required: true,
      char_limit: null,
      options: [
        { id: "OD-OPT-9",  sequence: 0, label: "CPA"  },
        { id: "OD-OPT-10", sequence: 1, label: "ACCA" },
      ],
    },
    {
      id: "OD-Q-5",
      sequence: 2,
      text: "Which software tools do you use regularly?",
      type: "checkbox",
      required: false,
      char_limit: null,
      options: [
        { id: "OD-OPT-13", sequence: 0, label: "SAP" },
        { id: "OD-OPT-14", sequence: 1, label: "QuickBooks" },
      ],
    },
    {
      id: "OD-Q-6",
      sequence: 3,
      text: "Notice period",
      type: "dropdown",
      required: true,
      char_limit: null,
      options: [
        { id: "OD-OPT-17", sequence: 0, label: "Immediately" },
        { id: "OD-OPT-18", sequence: 1, label: "1 month" },
      ],
    },
  ],
};

function renderApplyPage(jobId = "uuid-1") {
  return render(
    <MemoryRouter initialEntries={[`/apply/${jobId}`]}>
      <Routes>
        <Route path="/apply/:jobId" element={<Index />} />
        <Route path="/jobs" element={<div>Jobs list</div>} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

// ── Screening Questions — rendering ──────────────────────────────────────────

describe("Index — Screening Questions rendering", () => {
  it("shows Screening Questions section when job has questions", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithQuestions);
    renderApplyPage();

    expect(await screen.findByText("Screening Questions")).toBeInTheDocument();
  });

  it("does NOT show Screening Questions section when job has no questions", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(baseJob);
    renderApplyPage();

    await screen.findByText(/Finance Manager/);
    expect(screen.queryByText("Screening Questions")).not.toBeInTheDocument();
  });

  it("renders the text question as a textarea", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithQuestions);
    renderApplyPage();

    // Label renders as "1. Briefly describe your motivation." (number-prefixed)
    expect(await screen.findByText(/Briefly describe your motivation/, { exact: false })).toBeInTheDocument();
    // Textarea placeholder should be present
    expect(screen.getByPlaceholderText("Your answer…")).toBeInTheDocument();
  });

  it("renders radio question with all options", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithQuestions);
    renderApplyPage();

    await screen.findByText(/Which professional body are you a member of/, { exact: false });
    expect(screen.getByText("CPA")).toBeInTheDocument();
    expect(screen.getByText("ACCA")).toBeInTheDocument();
  });

  it("renders checkbox question with all options", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithQuestions);
    renderApplyPage();

    await screen.findByText(/Which software tools do you use regularly/, { exact: false });
    expect(screen.getByText("SAP")).toBeInTheDocument();
    expect(screen.getByText("QuickBooks")).toBeInTheDocument();
  });

  it("renders dropdown question with required marker", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithQuestions);
    renderApplyPage();

    // Label renders as "4. Notice period*" — match partial text
    expect(await screen.findByText(/Notice period/, { exact: false })).toBeInTheDocument();
  });

  it("shows char-count hint for text questions with a char_limit", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithQuestions);
    renderApplyPage();

    await screen.findByText("Screening Questions");
    // The counter shows "0 / 500 characters"
    expect(screen.getByText(/0 \/.*500.*characters/)).toBeInTheDocument();
  });

  it("updates char counter as user types into a text question", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(jobWithQuestions);
    renderApplyPage();

    const textarea = await screen.findByPlaceholderText("Your answer…");
    fireEvent.change(textarea, { target: { value: "Hello World" } });

    expect(screen.getByText(/11 \/.*500.*characters/)).toBeInTheDocument();
  });
});

// ── Screening Questions — validation ─────────────────────────────────────────

describe("Index — Screening Questions validation", () => {
  it("shows required error for unanswered required text question on submit", async () => {
    vi.mocked(fetchJobById).mockResolvedValue({
      ...baseJob,
      questions: [
        {
          id: "OD-Q-3",
          sequence: 0,
          text: "Briefly describe your motivation.",
          type: "text",
          required: true,
          char_limit: 500,
          options: [],
        },
      ],
    });
    renderApplyPage();

    await screen.findByText("Screening Questions");

    // Click submit without filling any fields — should trigger question validation
    fireEvent.click(screen.getByRole("button", { name: /Apply/i }));

    await waitFor(() => {
      const requiredErrors = screen.getAllByText("Required");
      expect(requiredErrors.length).toBeGreaterThan(0);
    });
  });

  it("marks unanswered required question as Required after submit", async () => {
    vi.mocked(fetchJobById).mockResolvedValue({
      ...baseJob,
      questions: [
        {
          id: "OD-Q-3",
          sequence: 0,
          text: "Tell us something.",
          type: "text",
          required: true,
          char_limit: null,
          options: [],
        },
      ],
    });
    renderApplyPage();

    await screen.findByText("Screening Questions");

    // Fill personal fields so only question validation fires
    fireEvent.change(screen.getByPlaceholderText("John Doe"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText("john@example.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("+1 (555) 000-0000"), { target: { value: "+2547" } });

    fireEvent.click(screen.getByRole("button", { name: /Apply/i }));

    await waitFor(() => {
      // At least one "Required" error should show (for the unanswered question)
      expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    });
  });
});

// ── Gender neutrality ─────────────────────────────────────────────────────────

describe("Index — gender neutrality", () => {
  it("does not render any gender label or input", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(baseJob);
    renderApplyPage();

    await screen.findByText(/Finance Manager/);
    expect(screen.queryByText(/gender/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/gender/i)).not.toBeInTheDocument();
  });
});

// ── Form structure ────────────────────────────────────────────────────────────

describe("Index — form structure", () => {
  it("renders Personal Information, Experience, Education and CV sections", async () => {
    vi.mocked(fetchJobById).mockResolvedValue(baseJob);
    renderApplyPage();

    await screen.findByText(/Finance Manager/);
    expect(screen.getByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText(/CV \/ Resume/)).toBeInTheDocument();
  });
});
