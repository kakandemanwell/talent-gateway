/**
 * Regression tests — applicationService.ts
 * Covers question_answers serialisation for all four question types,
 * and that gender is never included in the FormData payload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitApplication } from "@/lib/applicationService";
import type { ApplicationPayload } from "@/lib/applicationService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCvFile(): File {
  return new File(["dummy"], "cv.pdf", { type: "application/pdf" });
}

const basePayload: ApplicationPayload = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "+254712345678",
  summary: "Experienced finance professional.",
  cv: makeCvFile(),
  jobId: "uuid-1",
  experience: [
    {
      position: "Senior Accountant",
      employer: "ABC Ltd",
      description: "",
      startDate: "2018-01",
      endDate: "",
      isCurrent: true,
      years: "8",
    },
  ],
  education: [
    {
      qualification: "Bachelor of Commerce",
      level: "bachelor",
      field: "Accounting",
      institution: "University of Nairobi",
      yearCompleted: "2015",
      accolade: null,
    },
  ],
  questionAnswers: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("submitApplication — question_answers serialisation", () => {
  let capturedForm: FormData;

  beforeEach(() => {
    capturedForm = new FormData();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        capturedForm = init.body as FormData;
        return Promise.resolve({
          ok: true,
          json: async () => ({ applicationId: "app-uuid-1" }),
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("omits question_answers field when there are no questions", async () => {
    await submitApplication({ ...basePayload, questionAnswers: [] });
    expect(capturedForm.has("question_answers")).toBe(false);
  });

  it("serialises text answer correctly", async () => {
    await submitApplication({
      ...basePayload,
      questionAnswers: [
        { question_id: "OD-Q-3", type: "text", answer: "I am passionate about public sector finance." },
      ],
    });

    const raw = capturedForm.get("question_answers") as string;
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0].question_id).toBe("OD-Q-3");
    expect(parsed[0].type).toBe("text");
    expect(parsed[0].answer).toBe("I am passionate about public sector finance.");
    expect(parsed[0]).not.toHaveProperty("answers");
  });

  it("serialises radio answer as single OD-OPT string", async () => {
    await submitApplication({
      ...basePayload,
      questionAnswers: [
        { question_id: "OD-Q-4", type: "radio", answer: "OD-OPT-9" },
      ],
    });

    const parsed = JSON.parse(capturedForm.get("question_answers") as string) as Array<Record<string, unknown>>;
    expect(parsed[0].answer).toBe("OD-OPT-9");
    expect(parsed[0]).not.toHaveProperty("answers");
  });

  it("serialises dropdown answer as single OD-OPT string", async () => {
    await submitApplication({
      ...basePayload,
      questionAnswers: [
        { question_id: "OD-Q-6", type: "dropdown", answer: "OD-OPT-18" },
      ],
    });

    const parsed = JSON.parse(capturedForm.get("question_answers") as string) as Array<Record<string, unknown>>;
    expect(parsed[0].answer).toBe("OD-OPT-18");
    expect(parsed[0]).not.toHaveProperty("answers");
  });

  it("serialises checkbox answers as an array of OD-OPT strings", async () => {
    await submitApplication({
      ...basePayload,
      questionAnswers: [
        { question_id: "OD-Q-5", type: "checkbox", answers: ["OD-OPT-13", "OD-OPT-15"] },
      ],
    });

    const parsed = JSON.parse(capturedForm.get("question_answers") as string) as Array<Record<string, unknown>>;
    expect(parsed[0].answers).toEqual(["OD-OPT-13", "OD-OPT-15"]);
    expect(parsed[0]).not.toHaveProperty("answer");
  });

  it("handles mixed question types in a single submission", async () => {
    await submitApplication({
      ...basePayload,
      questionAnswers: [
        { question_id: "OD-Q-3", type: "text",     answer: "Motivated." },
        { question_id: "OD-Q-4", type: "radio",    answer: "OD-OPT-9" },
        { question_id: "OD-Q-5", type: "checkbox", answers: ["OD-OPT-13"] },
        { question_id: "OD-Q-6", type: "dropdown", answer: "OD-OPT-17" },
      ],
    });

    const parsed = JSON.parse(capturedForm.get("question_answers") as string) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(4);
    expect(parsed[0].type).toBe("text");
    expect(parsed[1].type).toBe("radio");
    expect(parsed[2].type).toBe("checkbox");
    expect(parsed[3].type).toBe("dropdown");
  });
});

describe("submitApplication — gender neutrality", () => {
  let capturedForm: FormData;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        capturedForm = init.body as FormData;
        return Promise.resolve({
          ok: true,
          json: async () => ({ applicationId: "app-uuid-2" }),
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never includes a gender field in the FormData payload", async () => {
    await submitApplication(basePayload);
    // Check both direct field and any JSON-encoded field that might contain gender
    expect(capturedForm.has("gender")).toBe(false);
    const experienceJson = capturedForm.get("experience") as string;
    const educationJson  = capturedForm.get("education")  as string;
    expect(experimentalStringContainsGender(experienceJson)).toBe(false);
    expect(experimentalStringContainsGender(educationJson)).toBe(false);
  });
});

function experimentalStringContainsGender(s: string | null): boolean {
  if (!s) return false;
  return /"gender"/.test(s);
}

describe("submitApplication — core required fields", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ applicationId: "app-uuid-3" }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns applicationId on success", async () => {
    const result = await submitApplication(basePayload);
    expect(result.applicationId).toBe("app-uuid-3");
  });

  it("throws a descriptive error on non-ok response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({ error: "cv file is required" }),
    });

    await expect(submitApplication(basePayload)).rejects.toThrow("cv file is required");
  });
});
