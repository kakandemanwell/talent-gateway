import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { messageTemplates, PIPELINE_STAGES } from "@/data/mock";
import { Plus, Send, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Messaging() {
  const [active, setActive] = useState(messageTemplates[0]);
  return (
    <div className="space-y-6">
      <PageHeader title="Messaging" description="Templates and bulk emails for every stage." actions={<Button><Plus className="mr-1 h-4 w-4" />New template</Button>} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Templates</CardTitle></CardHeader>
          <CardContent className="space-y-1 p-2">
            {messageTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t)}
                className={`flex w-full items-start justify-between gap-2 rounded-md p-3 text-left text-sm transition-colors hover:bg-muted ${active.id === t.id ? "bg-muted" : ""}`}
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t.subject}</p>
                </div>
                <Badge variant="outline" className="shrink-0">{t.trigger}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Edit template</CardTitle>
            <Button size="sm" onClick={() => toast({ title: "Bulk message queued", description: `Sending "${active.name}" to candidates in stage ${active.trigger}.` })}>
              <Send className="mr-1 h-3.5 w-3.5" />Send to {String(active.trigger)} stage
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input value={active.name} readOnly /></div>
              <div className="space-y-2"><Label>Trigger stage</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={active.trigger} readOnly>
                  {[...PIPELINE_STAGES, "Manual"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2"><Label>Subject</Label><Input value={active.subject} readOnly /></div>
            <div className="space-y-2"><Label>Body</Label><Textarea rows={8} value={active.body} readOnly /></div>
            <p className="text-xs text-muted-foreground">Use <code>{"{{name}}"}</code> and <code>{"{{job}}"}</code> as placeholders.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
