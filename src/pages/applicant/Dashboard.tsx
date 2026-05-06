import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobListings, myApplications, applicantProfile } from "@/data/mock";
import { Briefcase, FileText, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";

export default function ApplicantDashboard() {
  const recommended = jobListings.slice(0, 3);
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${applicantProfile.name.split(" ")[0]}`} description="Track your applications and discover new opportunities." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Profile completion" value={`${applicantProfile.completion}%`} icon={CheckCircle2} tone="success" />
        <StatCard label="Applications" value={myApplications.length} icon={FileText} tone="info" />
        <StatCard label="In interview" value={1} icon={Sparkles} tone="warning" />
        <StatCard label="Recommended jobs" value={recommended.length} icon={Briefcase} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Profile completion</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Progress value={applicantProfile.completion} />
            <p className="text-sm text-muted-foreground">Add a portfolio link and a CV to reach 100%.</p>
            <Button variant="outline" asChild className="w-full"><Link to="/app/applicant/profile">Complete profile</Link></Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent applications</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/app/applicant/applications">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {myApplications.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{a.jobTitle}</p>
                  <p className="text-xs text-muted-foreground">{a.organization} · Applied {a.appliedAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MatchScoreBadge score={a.score} />
                  <Badge variant="outline">{a.stage}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recommended for you</CardTitle>
          <Button variant="ghost" size="sm" asChild><Link to="/app/applicant/jobs">Browse all jobs <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {recommended.map((j) => (
            <Link key={j.id} to={`/app/applicant/jobs/${j.id}`} className="group rounded-md border p-4 transition-colors hover:border-primary">
              <p className="font-medium group-hover:text-primary">{j.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{j.organization} · {j.location}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline">{j.industry}</Badge>
                <MatchScoreBadge score={80 + (j.title.length % 15)} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
