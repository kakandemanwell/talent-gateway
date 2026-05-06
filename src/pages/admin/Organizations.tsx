import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { organizations } from "@/data/mock";
import { CheckCircle2, XCircle } from "lucide-react";

const tone: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Organizations() {
  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Verify, approve, or suspend tenant organizations." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Applications</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-muted-foreground">{o.industry}</TableCell>
                  <TableCell><Badge variant="outline" className={tone[o.status]}>{o.status}</Badge></TableCell>
                  <TableCell className="text-right">{o.members}</TableCell>
                  <TableCell className="text-right">{o.jobs}</TableCell>
                  <TableCell className="text-right">{o.applications}</TableCell>
                  <TableCell className="text-right">
                    {o.status === "pending" ? (
                      <Button size="sm" variant="outline"><CheckCircle2 className="mr-1 h-3.5 w-3.5 text-success" />Verify</Button>
                    ) : o.status === "active" ? (
                      <Button size="sm" variant="ghost"><XCircle className="mr-1 h-3.5 w-3.5 text-destructive" />Suspend</Button>
                    ) : (
                      <Button size="sm" variant="ghost">Reactivate</Button>
                    )}
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
