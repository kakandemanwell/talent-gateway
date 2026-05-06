import { useRole } from "@/store/roleStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { UserCog } from "lucide-react";
import type { Role } from "@/data/mock";

const labels: Record<Role, string> = {
  applicant: "Applicant",
  recruiter: "Recruiter",
  admin: "SaaS Admin",
};

const homes: Record<Role, string> = {
  applicant: "/app/applicant/dashboard",
  recruiter: "/app/org/dashboard",
  admin: "/app/admin/dashboard",
};

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2">
      <UserCog className="h-4 w-4 text-muted-foreground" />
      <Select
        value={role}
        onValueChange={(v: Role) => {
          setRole(v);
          navigate(homes[v]);
        }}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(labels) as Role[]).map((r) => (
            <SelectItem key={r} value={r}>{labels[r]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
