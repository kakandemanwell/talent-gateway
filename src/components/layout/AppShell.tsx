import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useRole } from "@/store/roleStore";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Briefcase, Users, KanbanSquare, Building2, Settings,
  MessageSquare, BarChart3, FileText, User, Search, Bell, Sparkles, ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/data/mock";

const navByRole: Record<Role, { to: string; label: string; icon: any }[]> = {
  applicant: [
    { to: "/app/applicant/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/applicant/jobs", label: "Browse Jobs", icon: Briefcase },
    { to: "/app/applicant/applications", label: "My Applications", icon: FileText },
    { to: "/app/applicant/profile", label: "Profile", icon: User },
  ],
  recruiter: [
    { to: "/app/org/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/org/jobs", label: "Jobs", icon: Briefcase },
    { to: "/app/org/pipeline", label: "Pipeline", icon: KanbanSquare },
    { to: "/app/org/messaging", label: "Messaging", icon: MessageSquare },
    { to: "/app/org/team", label: "Team", icon: Users },
    { to: "/app/org/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/app/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/app/admin/organizations", label: "Organizations", icon: Building2 },
    { to: "/app/admin/analytics", label: "Analytics", icon: BarChart3 },
  ],
};

const roleLabel: Record<Role, string> = {
  applicant: "Applicant Workspace",
  recruiter: "Acme Talent Group",
  admin: "Platform Admin",
};

export default function AppShell() {
  const { role } = useRole();
  const items = navByRole[role];
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">TalentGateway</p>
            <p className="text-[11px] text-sidebar-foreground/60">{roleLabel[role]}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/40 p-2 text-xs text-sidebar-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Scoring API · Connected
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-background px-4 md:px-6">
          <div className="hidden flex-1 max-w-md md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search candidates, jobs, organizations…" className="pl-9" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px]">3</Badge>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
