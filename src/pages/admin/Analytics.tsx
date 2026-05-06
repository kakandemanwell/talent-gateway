import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformAnalytics } from "@/data/mock";
import { Activity, TrendingUp, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function PlatformAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platform analytics" description="Engagement, success rates, and usage trends." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Daily active orgs" value="98" icon={Activity} tone="info" />
        <StatCard label="Application success rate" value="11.4%" icon={Target} tone="success" />
        <StatCard label="MoM growth" value="+18%" icon={TrendingUp} tone="warning" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Organizations growth</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platformAnalytics.growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="orgs" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
