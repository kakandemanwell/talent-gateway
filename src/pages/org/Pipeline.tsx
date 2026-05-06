import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { candidates as seedCandidates, jobListings, PIPELINE_STAGES, type Candidate, type PipelineStage } from "@/data/mock";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { Search, RotateCw, MoreHorizontal } from "lucide-react";

export default function Pipeline() {
  const { jobId } = useParams();
  const job = useMemo(() => jobListings.find((j) => j.id === jobId) || jobListings[0], [jobId]);
  const [list, setList] = useState<Candidate[]>(() => seedCandidates.map((c) => ({ ...c, jobId: job.id })));
  const [q, setQ] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const filtered = list.filter((c) => q === "" || c.name.toLowerCase().includes(q.toLowerCase()) || c.skills.some(s => s.toLowerCase().includes(q.toLowerCase())));

  const move = (id: string, stage: PipelineStage) =>
    setList((arr) => arr.map((c) => (c.id === id ? { ...c, stage } : c)));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pipeline · ${job.title}`}
        description={`${list.length} candidates across ${PIPELINE_STAGES.length} stages`}
        actions={
          <>
            <Button variant="outline" size="sm" disabled><RotateCw className="mr-1 h-3.5 w-3.5" />Re-run matching</Button>
            <Button size="sm" asChild><Link to="/app/org/jobs">Back to jobs</Link></Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates or skills" className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="-mx-2 flex gap-3 overflow-x-auto pb-3">
        {PIPELINE_STAGES.map((stage) => {
          const items = filtered.filter((c) => c.stage === stage);
          return (
            <div
              key={stage}
              className="w-[280px] shrink-0 rounded-lg border bg-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { move(dragId, stage); setDragId(null); } }}
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{stage}</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">{items.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2 p-2">
                {items.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    className="cursor-grab rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                  >
                    <Link to={`/app/org/candidates/${c.id}`} className="block">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium hover:text-primary">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.experienceYears}y · {c.location.split(",")[0]}</p>
                        </div>
                        <MatchScoreBadge score={c.score} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.skills.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </Link>
                  </div>
                ))}
                {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop candidates here</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
