/**
 * Regression tests — jobService.ts
 * Covers types / fetch behaviour for skills, questions, closing_date.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchActiveJobs, fetchJobById } from "@/lib/jobService";
import type { Job } from "@/lib/jobService";

// ── Fixture ──────────────────────────────────────────────────────────────────

const baseJob: Job = {
  id: "uuid-1",
  odoo_job_id: "OD-7",
  title: "Finance Manager",
  department: "Finance",
  location: "Nairobi",
  closing_date: "2026-04-30",
  description: "<p>Full HTML job description…</p>",
  is_active: true,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
  skills: [
    { name: "IFRS", type: "Accounting Standards" },
    { name: "Excel", type: "Computer Skills" },
  ],
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
      text: "Which software tools do you use?",
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

// ── fetchActiveJobs ───────────────────────────────────────────────────────────

describe("fetchActiveJobs", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an array of jobs including skills array", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [baseJob],
    });

    const jobs = await fetchActiveJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].skills).toHaveLength(2);
    expect(jobs[0].skills[0].name).toBe("IFRS");
    expect(jobs[0].skills[0].type).toBe("Accounting Standards");
  });

  it("throws on non-ok response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(fetchActiveJobs()).rejects.toThrow("Failed to fetch jobs: 500");
  });
});

// ── fetchJobById ──────────────────────────────────────────────────────────────

describe("fetchJobById", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a job with questions and options", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseJob,
    });

    const job = await fetchJobById("uuid-1");
    expect(job).not.toBeNull();
    expect(job!.questions).toHaveLength(4);

    const textQ = job!.questions.find((q) => q.type === "text");
    expect(textQ?.required).toBe(true);
    expect(textQ?.char_limit).toBe(500);
    expect(textQ?.options).toHaveLength(0);

    const radioQ = job!.questions.find((q) => q.type === "radio");
    expect(radioQ?.options).toHaveLength(2);
    expect(radioQ?.options[0].id).toBe("OD-OPT-9");

    const checkboxQ = job!.questions.find((q) => q.type === "checkbox");
    expect(checkboxQ?.required).toBe(false);

    const dropdownQ = job!.questions.find((q) => q.type === "dropdown");
    expect(dropdownQ?.required).toBe(true);
  });

  it("returns null on 404", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const job = await fetchJobById("missing-id");
    expect(job).toBeNull();
  });

  it("closing_date is a single YYYY-MM-DD string, not a range", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseJob,
    });

    const job = await fetchJobById("uuid-1");
    expect(job!.closing_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Must NOT contain a slash or a second date
    expect(job!.closing_date).not.toContain("/");
    expect(job!.closing_date!.split("-")).toHaveLength(3);
  });

  it("closing_date may be null for open-ended jobs", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...baseJob, closing_date: null }),
    });

    const job = await fetchJobById("uuid-1");
    expect(job!.closing_date).toBeNull();
  });
});
