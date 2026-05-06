import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobListings } from "@/data/mock";
import { Briefcase, MapPin, Calendar, ArrowRight, Search } from "lucide-react";

const industries = ["All", ...Array.from(new Set(jobListings.map((j) => j.industry)))];
const types = ["All", "Full-time", "Part-time", "Contract", "Remote"];

export default function JobsList() {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const [type, setType] = useState("All");

  const filtered = jobListings.filter((j) =>
    (industry === "All" || j.industry === industry) &&
    (type === "All" || j.type === type) &&
    (q === "" || j.title.toLowerCase().includes(q.toLowerCase()) || j.organization.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Open Positions" description="Discover roles tailored to your skills." />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_200px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or organization" className="pl-9" />
          </div>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger><SelectValue placeholder="Industry" /></SelectTrigger>
            <SelectContent>{industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((job) => (
          <Link key={job.id} to={`/app/applicant/jobs/${job.id}`} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold group-hover:text-primary">{job.title}</h2>
                    <p className="text-sm text-muted-foreground">{job.organization}</p>
                  </div>
                  <Badge variant="outline" className="bg-accent text-accent-foreground border-transparent">{job.industry}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.type}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Closes {job.closingDate}</span>
                  <span className="ml-auto inline-flex items-center text-primary">Details <ArrowRight className="ml-1 h-3 w-3" /></span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No jobs match your filters.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
