import { useParams, Link, useNavigate } from "react-router-dom";
import { jobs } from "@/data/jobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const job = jobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The position you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/jobs">Browse All Jobs</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate("/jobs")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Jobs
        </Button>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <p className="mt-1 text-muted-foreground">{job.department}</p>
              </div>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 text-sm"
              >
                {job.type}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                {job.salary}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Posted {job.posted}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Closes {job.closingDate}
              </span>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">About the Role</h3>
              <p className="text-muted-foreground leading-relaxed">{job.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Requirements</h3>
              <ul className="space-y-2">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Responsibilities</h3>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    {resp}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="flex justify-center pt-2">
              <Button size="lg" className="px-10" asChild>
                <Link to={`/apply/${job.id}`}>Apply for this Position</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetail;
