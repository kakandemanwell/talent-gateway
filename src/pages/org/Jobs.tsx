import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jobListings } from "@/data/mock";
import { Plus, KanbanSquare } from "lucide-react";

export default function OrgJobs() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Manage your open positions and pipelines."
        actions={<Button asChild><Link to="/app/org/jobs/new"><Plus className="mr-1 h-4 w-4" />New job</Link></Button>}
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Applicants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobListings.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title}</TableCell>
                  <TableCell><Badge variant="outline">{j.industry}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{j.location}</TableCell>
                  <TableCell><Badge variant={j.status === "Open" ? "default" : "secondary"}>{j.status}</Badge></TableCell>
                  <TableCell className="text-right">{j.applicants}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/app/org/pipeline/${j.id}`}><KanbanSquare className="mr-1 h-3.5 w-3.5" />Pipeline</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
