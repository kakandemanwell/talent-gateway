import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { candidates, PIPELINE_STAGES } from "@/data/mock";
import { MatchScoreBadge } from "@/components/shared/MatchScoreBadge";
import { Mail, MessageSquare, Flag, X, ArrowLeft, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CandidateDetail() {
  const { id } = useParams();
  const c = candidates.find((x) => x.id === id) || candidates[0];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to={`/app/org/pipeline/${c.jobId}`}><ArrowLeft className="mr-1 h-4 w-4" />Back to pipeline</Link></Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14"><AvatarFallback className="bg-primary/10 text-primary">{c.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
              <div>
                <h1 className="text-2xl font-semibold">{c.name}</h1>
                <p className="text-sm text-muted-foreground">{c.title} · {c.location}</p>
                <div className="mt-2 flex items-center gap-2">
                  <MatchScoreBadge score={c.score} size="md" />
                  <Badge variant="outline">{c.stage}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select defaultValue={c.stage}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="sm"><Mail className="mr-1 h-3.5 w-3.5" />Message</Button>
              <Button variant="outline" size="sm"><Flag className="mr-1 h-3.5 w-3.5" />Flag</Button>
              <Button variant="destructive" size="sm"><X className="mr-1 h-3.5 w-3.5" />Reject</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">{c.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Experience</p>
              <p className="mt-1 text-sm">{c.experienceYears} years of relevant experience.</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Contact</p>
              <p className="mt-1 text-sm">{c.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Insights · Scoring API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Overall match</p>
              <p className="text-2xl font-semibold">{c.score}/100</p>
            </div>
            <ul className="space-y-1 text-sm">
              {c.insights.map((i) => (<li key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{i}</li>))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Activity & comments</CardTitle>
            <Button size="sm" variant="outline"><MessageSquare className="mr-1 h-3.5 w-3.5" />Add comment</Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Activity who="Liam Bennett" when="2 days ago" what={`Moved candidate to ${c.stage}.`} />
            <Activity who="Priya Shah" when="3 days ago" what="Strong portfolio — let's interview." />
            <Activity who="System" when={c.appliedAt} what="Application received." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Activity({ who, when, what }: { who: string; when: string; what: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{who.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
      <div className="flex-1">
        <p className="font-medium">{who} <span className="font-normal text-muted-foreground">· {when}</span></p>
        <p className="text-muted-foreground">{what}</p>
      </div>
    </div>
  );
}
