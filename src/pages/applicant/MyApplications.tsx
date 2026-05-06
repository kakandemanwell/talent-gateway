import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { myApplications } from "@/data/mock";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";

export default function MyApplications() {
  return (
    <div className="space-y-6">
      <PageHeader title="My applications" description="Track every role you've applied to." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myApplications.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.jobTitle}</TableCell>
                  <TableCell>{a.organization}</TableCell>
                  <TableCell className="text-muted-foreground">{a.appliedAt}</TableCell>
                  <TableCell><Badge variant="outline">{a.stage}</Badge></TableCell>
                  <TableCell className="text-right"><MatchScoreBadge score={a.score} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
