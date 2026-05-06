import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

interface CustomField { id: string; label: string; type: "text" | "choice" | "file" }

export default function NewJob() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("Engineering");
  const [type, setType] = useState("Full-time");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<CustomField[]>([]);

  const addField = (type: CustomField["type"]) =>
    setFields((f) => [...f, { id: Math.random().toString(36).slice(2), label: "", type }]);

  const publish = () => {
    toast({ title: "Job published", description: `${title || "Untitled job"} is now live.` });
    navigate("/app/org/jobs");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Create a job" description={`Step ${step} of 3`} />

      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <Card><CardContent className="p-6 space-y-4">
        {step === 1 && (
          <>
            <div className="space-y-2"><Label>Job title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Engineering","Design","Finance","Healthcare","Agriculture","Operations"].map((i)=><SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Full-time","Part-time","Contract","Remote"].map((i)=><SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Cape Town" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea rows={6} value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="What you'll do, who we're looking for…" /></div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted-foreground">Add custom application fields candidates will fill out.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => addField("text")}><Plus className="mr-1 h-3 w-3" />Text input</Button>
              <Button size="sm" variant="outline" onClick={() => addField("choice")}><Plus className="mr-1 h-3 w-3" />Multiple choice</Button>
              <Button size="sm" variant="outline" onClick={() => addField("file")}><Plus className="mr-1 h-3 w-3" />File upload</Button>
            </div>
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3 rounded-md border p-3">
                  <Badge variant="outline">{f.type}</Badge>
                  <Input placeholder="Field label" value={f.label} onChange={(e) => {
                    const v = e.target.value;
                    setFields((arr) => arr.map((x, idx) => idx === i ? { ...x, label: v } : x));
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => setFields((a) => a.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {fields.length === 0 && <p className="text-sm text-muted-foreground">No custom fields yet.</p>}
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-md border p-4">
              <p className="text-xs uppercase text-muted-foreground">Title</p>
              <p className="font-medium">{title || "Untitled job"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Industry" value={industry} />
              <Field label="Type" value={type} />
              <Field label="Location" value={location || "—"} />
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs uppercase text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{description || "—"}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs uppercase text-muted-foreground">Custom fields</p>
              <ul className="mt-2 space-y-1 text-sm">
                {fields.map((f) => (<li key={f.id} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{f.label || "(unnamed)"} <Badge variant="outline" className="ml-1">{f.type}</Badge></li>))}
                {fields.length === 0 && <li className="text-muted-foreground">No custom fields.</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
          ) : (
            <Button onClick={publish}>Publish job</Button>
          )}
        </div>
      </CardContent></Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
