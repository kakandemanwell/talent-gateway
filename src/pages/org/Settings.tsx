import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES } from "@/data/mock";
import { Plus } from "lucide-react";

export default function OrgSettings() {
  return (
    <div className="space-y-6">
      <PageHeader title="Organization settings" description="Branding and pipeline configuration." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Organization profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input defaultValue="Acme Talent Group" /></div>
            <div className="space-y-2"><Label>Industry</Label><Input defaultValue="Recruitment" /></div>
            <div className="space-y-2"><Label>Website</Label><Input defaultValue="https://acme.com" /></div>
            <div className="space-y-2"><Label>About</Label><Textarea rows={4} defaultValue="A modern recruitment partner for fast-growing teams." /></div>
            <Button>Save changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline stages</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Customize the stages used across all jobs.</p>
            <div className="space-y-2">
              {PIPELINE_STAGES.map((s, i) => (
                <div key={s} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2"><Badge variant="outline">{i + 1}</Badge><span>{s}</span></div>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm"><Plus className="mr-1 h-3 w-3" />Add stage</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
