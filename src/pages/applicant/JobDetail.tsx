import { Link, useParams } from "react-router-dom";
import { jobListings } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Briefcase, MapPin, Calendar, DollarSign, CheckCircle2 } from "lucide-react";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";

export default function JobDetail() {
  const { jobId } = useParams();
  const job = jobListings.find((j) => j.id === jobId);
  if (!job) return <div className="p-8">Job not found. <Link className="text-primary" to="/app/applicant/jobs">Back to jobs</Link></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/app/applicant/jobs"><ArrowLeft className="mr-1 h-4 w-4" /> Back to jobs</Link></Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{job.title}</h1>
              <p className="mt-1 text-muted-foreground">{job.organization} · {job.department}</p>
            </div>
            <div className="flex items-center gap-2">
              <MatchScoreBadge score={86} size="md" />
              <Button asChild><Link to={`/app/applicant/apply/${job.id}`}>Apply now</Link></Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{job.type}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>
            <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" />{job.salary}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Closes {job.closingDate}</span>
            <Badge variant="outline" className="bg-accent text-accent-foreground border-transparent">{job.industry}</Badge>
          </div>

          <Separator className="my-6" />

          <section>
            <h2 className="text-lg font-semibold">About the role</h2>
            <p className="mt-2 text-muted-foreground">{job.description}</p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold">Requirements</h2>
            <ul className="mt-2 space-y-2">
              {job.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />{r}</li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold">Responsibilities</h2>
            <ul className="mt-2 space-y-2">
              {job.responsibilities.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />{r}</li>
              ))}
            </ul>
          </section>

          <Separator className="my-6" />

          <div className="flex justify-end">
            <Button size="lg" asChild><Link to={`/app/applicant/apply/${job.id}`}>Apply for this position</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
