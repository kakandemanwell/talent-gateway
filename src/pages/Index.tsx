import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchJobById, type Job } from "@/lib/jobService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, FileText, Briefcase, GraduationCap, User, CheckCircle2, Loader2, ClipboardList } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { submitApplication } from "@/lib/applicationService";

interface ExperienceRow {
  id: string;
  position: string;
  description: string;
  employer: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  years: string;
}

interface EducationRow {
  id: string;
  qualification: string;
  level: string;
  field: string;
  institution: string;
  yearCompleted: string;
  accolade: File | null;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  cv?: string;
  summary?: string;
  experience?: Record<string, Record<string, string>>;
  education?: Record<string, Record<string, string>>;
  questions?: Record<string, string>;
}

interface QuestionAnswerState {
  question_id: string;
  type: "text" | "radio" | "checkbox" | "dropdown";
  answer: string;    // for text, radio, dropdown
  answers: string[]; // for checkbox (array of OD-OPT-{n} ids)
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const MAX_CV_SIZE = 12 * 1024 * 1024; // 12MB

const EDUCATION_LEVELS: { key: string; label: string }[] = [
  { key: "certificate",    label: "Certificate" },
  { key: "diploma",        label: "Diploma" },
  { key: "higher_diploma", label: "Higher Diploma" },
  { key: "bachelor",       label: "Bachelor's Degree" },
  { key: "honours",        label: "Honours Degree" },
  { key: "master",         label: "Master's Degree" },
  { key: "phd",            label: "PhD / Doctorate" },
  { key: "other",          label: "Other" },
];

const computeYears = (start: string, end: string): string => {
  if (!start || !end) return "";
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const months = (ey - sy) * 12 + (em - sm);
  if (months <= 0) return "0";
  const years = months / 12;
  return (Math.round(years * 2) / 2).toString();
};

const computeYearsFromNow = (start: string): string => {
  if (!start) return "";
  const now = new Date();
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return computeYears(start, end);
};

const createEmptyExperience = (): ExperienceRow => ({
  id: generateId(),
  position: "",
  description: "",
  employer: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  years: "",
});

const createEmptyEducation = (): EducationRow => ({
  id: generateId(),
  qualification: "",
  level: "",
  field: "",
  institution: "",
  yearCompleted: "",
  accolade: null,
});

const Index = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [jobLoading, setJobLoading] = useState(!!jobId);

  useEffect(() => {
    if (!jobId) {
      navigate("/jobs", { replace: true });
      return;
    }
    fetchJobById(jobId)
      .then((data) => {
        if (!data) navigate("/jobs", { replace: true });
        else {
          setJob(data);
          setQuestionAnswers(
            (data.questions ?? []).map((q) => ({
              question_id: q.id,
              type: q.type,
              answer: "",
              answers: [],
            }))
          );
        }
      })
      .catch(() => navigate("/jobs", { replace: true }))
      .finally(() => setJobLoading(false));
  }, [jobId, navigate]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [experience, setExperience] = useState<ExperienceRow[]>([createEmptyExperience()]);
  const [education, setEducation] = useState<EducationRow[]>([createEmptyEducation()]);
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswerState[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setErrors((prev) => ({ ...prev, cv: "Only PDF files are accepted." }));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_CV_SIZE) {
      setErrors((prev) => ({ ...prev, cv: "File size must not exceed 12MB." }));
      e.target.value = "";
      return;
    }
    setCv(file);
    setErrors((prev) => ({ ...prev, cv: undefined }));
  };

  const handleAccoladeChange = (eduId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Only PDF files are accepted for accolades.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setEducation((prev) =>
      prev.map((row) => (row.id === eduId ? { ...row, accolade: file } : row))
    );
  };

  const updateExperience = (id: string, field: keyof ExperienceRow, value: string) => {
    setExperience((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "startDate" || field === "endDate") {
          updated.years = row.isCurrent
            ? computeYearsFromNow(updated.startDate)
            : computeYears(updated.startDate, updated.endDate);
        }
        return updated;
      })
    );
  };

  const toggleIsCurrent = (id: string) => {
    setExperience((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const isCurrent = !row.isCurrent;
        return {
          ...row,
          isCurrent,
          endDate: isCurrent ? "" : row.endDate,
          years: isCurrent
            ? computeYearsFromNow(row.startDate)
            : computeYears(row.startDate, row.endDate),
        };
      })
    );
  };

  const updateEducation = (id: string, field: keyof EducationRow, value: string) => {
    setEducation((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const updateQuestionAnswer = (questionId: string, value: string) => {
    setQuestionAnswers((prev) =>
      prev.map((qa) =>
        qa.question_id === questionId ? { ...qa, answer: value } : qa
      )
    );
  };

  const toggleCheckboxAnswer = (questionId: string, optionId: string) => {
    setQuestionAnswers((prev) =>
      prev.map((qa) => {
        if (qa.question_id !== questionId) return qa;
        const has = qa.answers.includes(optionId);
        return {
          ...qa,
          answers: has
            ? qa.answers.filter((a) => a !== optionId)
            : [...qa.answers, optionId],
        };
      })
    );
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!phone.trim()) newErrors.phone = "Phone number is required.";
    if (!cv) newErrors.cv = "CV attachment is required.";

    const expErrors: Record<string, Record<string, string>> = {};
    experience.forEach((row) => {
      const rowErr: Record<string, string> = {};
      if (!row.position.trim()) rowErr.position = "Required";
      if (!row.employer.trim()) rowErr.employer = "Required";
      if (!row.startDate) rowErr.startDate = "Required";
      if (!row.isCurrent && !row.endDate) rowErr.endDate = "Required";
      if (Object.keys(rowErr).length) expErrors[row.id] = rowErr;
    });
    if (Object.keys(expErrors).length) newErrors.experience = expErrors;

    const eduErrors: Record<string, Record<string, string>> = {};
    education.forEach((row) => {
      const rowErr: Record<string, string> = {};
      if (!row.qualification.trim()) rowErr.qualification = "Required";
      if (!row.level) rowErr.level = "Required";
      if (!row.field.trim()) rowErr.field = "Required";
      if (!row.institution.trim()) rowErr.institution = "Required";
      if (!row.yearCompleted.trim()) rowErr.yearCompleted = "Required";
      if (Object.keys(rowErr).length) eduErrors[row.id] = rowErr;
    });
    if (Object.keys(eduErrors).length) newErrors.education = eduErrors;

    const qErrors: Record<string, string> = {};
    (job?.questions ?? []).forEach((q) => {
      if (!q.required) return;
      const qa = questionAnswers.find((a) => a.question_id === q.id);
      if (!qa) { qErrors[q.id] = "Required"; return; }
      if (q.type === "checkbox") {
        if (qa.answers.length === 0) qErrors[q.id] = "This question requires at least one selection.";
      } else {
        if (!qa.answer.trim()) qErrors[q.id] = "Required";
      }
    });
    if (Object.keys(qErrors).length) newErrors.questions = qErrors;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitApplication({
        fullName,
        email,
        phone,
        summary,
        cv: cv!,
        jobId: job!.id,
        experience: experience.map((exp) => ({
          position: exp.position,
          description: exp.description,
          employer: exp.employer,
          startDate: exp.startDate,
          endDate: exp.isCurrent ? "" : exp.endDate,
          isCurrent: exp.isCurrent,
          years: exp.years,
        })),
        education: education.map((edu) => ({
          qualification: edu.qualification,
          level: edu.level,
          field: edu.field,
          institution: edu.institution,
          yearCompleted: edu.yearCompleted,
          accolade: edu.accolade,
        })),
        questionAnswers: questionAnswers.map((qa) =>
          qa.type === "checkbox"
            ? { question_id: qa.question_id, type: qa.type, answers: qa.answers }
            : { question_id: qa.question_id, type: qa.type, answer: qa.answer }
        ),
      });

      setShowSuccess(true);

      // Reset form after successful submission
      setFullName("");
      setEmail("");
      setPhone("");
      setSummary("");
      setCv(null);
      setExperience([createEmptyExperience()]);
      setEducation([createEmptyEducation()]);
      setErrors({});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {job ? `Apply: ${job.title}` : "Job Application"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {job
              ? [job.department, job.location].filter(Boolean).join(" · ")
              : "Fill in the form below to apply for this position."}
          </p>
          {job && (
            <Link to={`/jobs/${job.id}`} className="mt-1 inline-block text-sm text-primary hover:underline">
              ← View full job listing
            </Link>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Summary / Short Introduction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Tell us a little about yourself, your career goals, and why you're a great fit for this role..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-primary" />
                Experience
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExperience((prev) => [...prev, createEmptyExperience()])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {experience.map((row, index) => (
                <div
                  key={row.id}
                  className={`rounded-lg border bg-muted/20 p-4 ${index > 0 ? "mt-4" : ""}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Experience #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setExperience((prev) =>
                          prev.length > 1 ? prev.filter((r) => r.id !== row.id) : prev
                        )
                      }
                      disabled={experience.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {/* Row 1: Position, Description, Employer */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Position/Role *</Label>
                      <Input
                        placeholder="e.g. Software Engineer"
                        value={row.position}
                        onChange={(e) => updateExperience(row.id, "position", e.target.value)}
                        className={errors.experience?.[row.id]?.position ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Input
                        placeholder="Brief description"
                        value={row.description}
                        onChange={(e) => updateExperience(row.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Employer *</Label>
                      <Input
                        placeholder="Company name"
                        value={row.employer}
                        onChange={(e) => updateExperience(row.id, "employer", e.target.value)}
                        className={errors.experience?.[row.id]?.employer ? "border-destructive" : ""}
                      />
                    </div>
                  </div>
                  {/* Row 2: Start Date, End Date, Years */}
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Start Date *</Label>
                      <Input
                        type="month"
                        value={row.startDate}
                        onChange={(e) => updateExperience(row.id, "startDate", e.target.value)}
                        className={errors.experience?.[row.id]?.startDate ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>End Date {!row.isCurrent && <span className="text-destructive">*</span>}</Label>
                      <Input
                        type="month"
                        value={row.endDate}
                        disabled={row.isCurrent}
                        onChange={(e) => updateExperience(row.id, "endDate", e.target.value)}
                        className={errors.experience?.[row.id]?.endDate ? "border-destructive" : ""}
                      />
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                        <Checkbox
                          checked={row.isCurrent}
                          onCheckedChange={() => toggleIsCurrent(row.id)}
                        />
                        Current position
                      </label>
                    </div>
                    <div className="space-y-1">
                      <Label>Years</Label>
                      <div className="flex min-h-10 items-center rounded-md border border-input bg-muted/50 px-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          {row.years ? `${row.years} yr${row.years !== "1" ? "s" : ""}` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                Education
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEducation((prev) => [...prev, createEmptyEducation()])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {education.map((row, index) => (
                <div
                  key={row.id}
                  className={`rounded-lg border bg-muted/20 p-4 ${index > 0 ? "mt-4" : ""}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Education #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEducation((prev) =>
                          prev.length > 1 ? prev.filter((r) => r.id !== row.id) : prev
                        )
                      }
                      disabled={education.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Qualification *</Label>
                      <Input
                        placeholder="e.g. BSc Computer Science"
                        value={row.qualification}
                        onChange={(e) => updateEducation(row.id, "qualification", e.target.value)}
                        className={errors.education?.[row.id]?.qualification ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Level *</Label>
                      <Select
                        value={row.level}
                        onValueChange={(val) => updateEducation(row.id, "level", val)}
                      >
                        <SelectTrigger className={errors.education?.[row.id]?.level ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map(({ key, label }) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Field of Study *</Label>
                      <Input
                        placeholder="e.g. Information Technology"
                        value={row.field}
                        onChange={(e) => updateEducation(row.id, "field", e.target.value)}
                        className={errors.education?.[row.id]?.field ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Institution *</Label>
                      <Input
                        placeholder="e.g. University of Cape Town"
                        value={row.institution}
                        onChange={(e) => updateEducation(row.id, "institution", e.target.value)}
                        className={errors.education?.[row.id]?.institution ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Year of Completion *</Label>
                      <Input
                        type="number"
                        min="1950"
                        max="2030"
                        placeholder="2024"
                        value={row.yearCompleted}
                        onChange={(e) => updateEducation(row.id, "yearCompleted", e.target.value)}
                        className={errors.education?.[row.id]?.yearCompleted ? "border-destructive" : ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Accolade (PDF)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleAccoladeChange(row.id, e)}
                          className="text-sm file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                        />
                      </div>
                      {row.accolade && (
                        <p className="text-xs text-muted-foreground">{row.accolade.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Screening Questions */}
          {job?.questions && job.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Screening Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {job.questions.map((q, idx) => {
                  const qa = questionAnswers.find((a) => a.question_id === q.id);
                  const hasError = !!errors.questions?.[q.id];
                  return (
                    <div key={q.id} className="space-y-2">
                      <Label className="text-sm font-medium leading-snug">
                        {idx + 1}. {q.text}
                        {q.required && <span className="ml-1 text-destructive">*</span>}
                      </Label>

                      {q.type === "text" && (
                        <div className="space-y-1">
                          <Textarea
                            placeholder="Your answer…"
                            value={qa?.answer ?? ""}
                            onChange={(e) => updateQuestionAnswer(q.id, e.target.value)}
                            maxLength={q.char_limit ?? undefined}
                            className={`min-h-[100px] ${hasError ? "border-destructive" : ""}`}
                          />
                          {q.char_limit && (
                            <p className="text-xs text-muted-foreground text-right">
                              {qa?.answer.length ?? 0} / {q.char_limit} characters
                            </p>
                          )}
                        </div>
                      )}

                      {q.type === "radio" && (
                        <RadioGroup
                          value={qa?.answer ?? ""}
                          onValueChange={(val) => updateQuestionAnswer(q.id, val)}
                          className={`space-y-2 rounded-md ${hasError ? "border border-destructive p-3" : ""}`}
                        >
                          {q.options.map((opt) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                              <Label
                                htmlFor={`${q.id}-${opt.id}`}
                                className="font-normal cursor-pointer"
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {q.type === "checkbox" && (
                        <div className={`space-y-2 rounded-md ${hasError ? "border border-destructive p-3" : ""}`}>
                          {q.options.map((opt) => (
                            <label
                              key={opt.id}
                              className="flex items-center gap-2 cursor-pointer select-none"
                            >
                              <Checkbox
                                checked={qa?.answers.includes(opt.id) ?? false}
                                onCheckedChange={() => toggleCheckboxAnswer(q.id, opt.id)}
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "dropdown" && (
                        <Select
                          value={qa?.answer ?? ""}
                          onValueChange={(val) => updateQuestionAnswer(q.id, val)}
                        >
                          <SelectTrigger className={hasError ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {q.options.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {hasError && (
                        <p className="text-sm text-destructive">{errors.questions![q.id]}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* CV Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary" />
                CV / Resume <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="cv">Upload your CV (PDF only, max 12MB)</Label>
                <Input
                  id="cv"
                  type="file"
                  accept=".pdf"
                  onChange={handleCvChange}
                  className={`text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground ${errors.cv ? "border-destructive" : ""}`}
                />
                {cv && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {cv.name} ({(cv.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {errors.cv && <p className="text-sm text-destructive">{errors.cv}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" size="lg" className="px-10" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </form>
      </div>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="items-center">
            <CheckCircle2 className="h-16 w-16 text-primary mb-2" />
            <AlertDialogTitle className="text-2xl">Application Submitted!</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Your job application has been received successfully. We will review your application and get back to you shortly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setShowSuccess(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
