import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { jobs } from "@/data/jobs";
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
import { Plus, Trash2, Upload, FileText, Briefcase, GraduationCap, User, CheckCircle2 } from "lucide-react";

interface ExperienceRow {
  id: string;
  position: string;
  description: string;
  employer: string;
  startDate: string;
  endDate: string;
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
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const MAX_CV_SIZE = 12 * 1024 * 1024; // 12MB

const EDUCATION_LEVELS = [
  "Certificate",
  "Diploma",
  "Higher Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD/Doctorate",
  "Other",
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

const createEmptyExperience = (): ExperienceRow => ({
  id: generateId(),
  position: "",
  description: "",
  employer: "",
  startDate: "",
  endDate: "",
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
  const job = jobId ? jobs.find((j) => j.id === jobId) : null;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [experience, setExperience] = useState<ExperienceRow[]>([createEmptyExperience()]);
  const [education, setEducation] = useState<EducationRow[]>([createEmptyEducation()]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

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
          updated.years = computeYears(updated.startDate, updated.endDate);
        }
        return updated;
      })
    );
  };

  const updateEducation = (id: string, field: keyof EducationRow, value: string) => {
    setEducation((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
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
      if (!row.endDate) rowErr.endDate = "Required";
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setShowSuccess(true);
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Job Application
          </h1>
          <p className="mt-2 text-muted-foreground">
            Fill in the form below to apply for this position.
          </p>
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
                      <Label>End Date *</Label>
                      <Input
                        type="month"
                        value={row.endDate}
                        onChange={(e) => updateExperience(row.id, "endDate", e.target.value)}
                        className={errors.experience?.[row.id]?.endDate ? "border-destructive" : ""}
                      />
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
                          {EDUCATION_LEVELS.map((lvl) => (
                            <SelectItem key={lvl} value={lvl}>
                              {lvl}
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
            <Button type="submit" size="lg" className="px-10">
              Apply
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
