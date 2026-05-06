import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { applicantProfile } from "@/data/mock";
import { Upload, Plus } from "lucide-react";

export default function ApplicantProfile() {
  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Build a strong profile so recruiters can find you." actions={<Button>Save changes</Button>} />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Profile completion</p>
            <p className="text-lg font-semibold">{applicantProfile.completion}%</p>
          </div>
          <Progress value={applicantProfile.completion} className="sm:max-w-md" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Full name</Label><Input defaultValue={applicantProfile.name} /></div>
            <div className="space-y-2"><Label>Headline</Label><Input defaultValue={applicantProfile.headline} /></div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue={applicantProfile.email} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input defaultValue={applicantProfile.phone} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Location</Label><Input defaultValue={applicantProfile.location} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Skills</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {applicantProfile.skills.map((s) => (<Badge key={s} variant="secondary">{s}</Badge>))}
              <Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" />Add skill</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Experience</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {applicantProfile.experience.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{e.role}</p>
                  <p className="text-xs text-muted-foreground">{e.company} · {e.years}</p>
                </div>
                <Button size="sm" variant="ghost">Edit</Button>
              </div>
            ))}
            <Button variant="outline" size="sm"><Plus className="mr-1 h-3 w-3" />Add experience</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Education</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {applicantProfile.education.map((e, i) => (
              <div key={i} className="rounded-md border p-3">
                <p className="font-medium">{e.qualification}</p>
                <p className="text-xs text-muted-foreground">{e.school} · {e.year}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">CV & portfolio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border-2 border-dashed p-6 text-center">
              <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm">Upload CV (PDF, max 12MB)</p>
              <Button variant="outline" size="sm" className="mt-3">Choose file</Button>
            </div>
            <div className="space-y-2"><Label>Portfolio links</Label><Textarea defaultValue={applicantProfile.portfolio.join("\n")} rows={3} /></div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Use my profile for recommendations</p>
                <p className="text-xs text-muted-foreground">Allow our scoring API to match you to jobs.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
