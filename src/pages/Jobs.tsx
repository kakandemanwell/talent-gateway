import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { fetchActiveJobs, type Job } from "@/lib/jobService";

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveJobs()
      .then(setJobs)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load jobs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Open Positions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse our current openings and find the perfect role for you.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            No open positions at this time. Please check back soon.
          </div>
        )}

        <div className="space-y-4">
          {jobs.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="block group">
              <Card className="transition-shadow hover:shadow-md border border-border">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {job.department && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}
                      {job.closing_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Closes {job.closing_date}
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {job.description.replace(/<[^>]*>/g, " ").trim()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {job.department ?? "Position"}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
