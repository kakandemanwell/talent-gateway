import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, Briefcase, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  { icon: Briefcase, title: "Job pipelines", desc: "Kanban boards, stage automation, bulk actions." },
  { icon: Users, title: "Candidate intelligence", desc: "Match scores and insights from our scoring API." },
  { icon: BarChart3, title: "Analytics", desc: "Funnel, conversion, time-to-hire, all in one place." },
];

const personas = [
  { title: "For Recruiters", points: ["Create jobs in minutes", "Drag-and-drop pipeline", "Bulk messaging"], cta: "Open Recruiter portal", to: "/app/org/dashboard" },
  { title: "For Applicants", points: ["Build your profile once", "Apply with one click", "Track every stage"], cta: "Open Applicant portal", to: "/app/applicant/dashboard" },
  { title: "For Platform Admins", points: ["Multi-tenant control", "Verify organizations", "Platform analytics"], cta: "Open Admin portal", to: "/app/admin/dashboard" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">TalentGateway</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth/login">Sign in</Link></Button>
            <Button asChild><Link to="/auth/signup">Get started</Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-soft)" }}>
        <div className="container py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              Modern recruitment, built for speed
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Hire faster. <span className="text-primary">Apply smarter.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              A multi-tenant recruitment platform that combines enterprise structure with startup-level speed —
              built around clean pipelines, smart scoring, and zero-friction applications.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/app/org/dashboard">Try the Recruiter portal <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/app/applicant/jobs">Browse jobs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Personas */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Built for every role in hiring</h2>
            <p className="mt-3 text-muted-foreground">Three tailored experiences in one platform.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {personas.map((p) => (
              <Card key={p.title}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="mt-6 w-full" asChild>
                    <Link to={p.to}>{p.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 TalentGateway. Built for modern hiring teams.
      </footer>
    </div>
  );
}
