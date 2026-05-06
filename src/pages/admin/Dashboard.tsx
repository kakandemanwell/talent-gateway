import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformAnalytics } from "@/data/mock";
import { Building2, Users, Briefcase, FileText } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Health of the entire TalentGateway network." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={platformAnalytics.kpis.organizations} icon={Building2} tone="info" delta="+8 this month" />
        <StatCard label="Users" value={platformAnalytics.kpis.users.toLocaleString()} icon={Users} tone="success" delta="+142 this month" />
        <StatCard label="Active jobs" value={platformAnalytics.kpis.jobs} icon={Briefcase} />
        <StatCard label="Applications" value={platformAnalytics.kpis.applications.toLocaleString()} icon={FileText} tone="warning" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Growth</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={platformAnalytics.growth}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="apps" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
