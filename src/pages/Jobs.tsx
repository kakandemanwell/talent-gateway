import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobs } from "@/data/jobs";
import { Briefcase, MapPin, Clock, Calendar, ArrowRight } from "lucide-react";

const typeColorMap: Record<string, string> = {
  "Full-time": "bg-primary/10 text-primary border-primary/20",
  "Part-time": "bg-accent text-accent-foreground",
  Contract: "bg-secondary text-secondary-foreground",
  Remote: "bg-primary/10 text-primary border-primary/20",
};

const Jobs = () => {
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Open Positions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse our current openings and find the perfect role for you.
          </p>
        </div>

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
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Closes {job.closingDate}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {job.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className={typeColorMap[job.type] ?? ""}>
                      {job.type}
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
