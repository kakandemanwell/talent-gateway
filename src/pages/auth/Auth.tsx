import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your TalentGateway account">
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); navigate("/app/org/dashboard"); }}
      >
        <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="you@company.com" defaultValue="recruiter@acme.com" /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" defaultValue="demo1234" /></div>
        <Button type="submit" className="w-full">Sign in</Button>
        <p className="text-center text-sm text-muted-foreground">
          New here? <Link to="/auth/signup" className="text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function Signup() {
  const navigate = useNavigate();
  return (
    <AuthShell title="Create your account" subtitle="Join TalentGateway in seconds">
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); navigate("/app/applicant/dashboard"); }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>First name</Label><Input defaultValue="Alex" /></div>
          <div className="space-y-2"><Label>Last name</Label><Input defaultValue="Morgan" /></div>
        </div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" defaultValue="alex@email.com" /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" defaultValue="demo1234" /></div>
        <Button type="submit" className="w-full">Create account</Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have one? <Link to="/auth/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold">TalentGateway</span>
        </Link>
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
