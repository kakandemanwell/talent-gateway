import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchJobById, type Job } from "@/lib/jobService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Briefcase, MapPin, Calendar, ArrowLeft, Loader2 } from "lucide-react";

const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      navigate("/jobs", { replace: true });
      return;
    }
    fetchJobById(jobId)
      .then((data) => {
        if (!data) setError("not_found");
        else setJob(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load job."))
      .finally(() => setLoading(false));
  }, [jobId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error === "not_found" || !job) {
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">Could Not Load Job</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
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
                {job.department && (
                  <p className="mt-1 text-muted-foreground">{job.department}</p>
                )}
              </div>
              {job.department && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-sm"
                >
                  {job.department}
                </Badge>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
              {job.closing_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Closes {job.closing_date}
                </span>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6 space-y-6">
            {job.description ? (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">About the Role</h3>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </div>
            ) : (
              <p className="text-muted-foreground">No description provided.</p>
            )}

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
