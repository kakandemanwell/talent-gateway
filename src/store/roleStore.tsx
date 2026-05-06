import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Role } from "@/data/mock";

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
}

const Ctx = createContext<RoleCtx | null>(null);
const KEY = "talent-gateway:role";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    if (typeof window === "undefined") return "recruiter";
    return (localStorage.getItem(KEY) as Role) || "recruiter";
  });
  useEffect(() => {
    localStorage.setItem(KEY, role);
  }, [role]);
  return <Ctx.Provider value={{ role, setRole: setRoleState }}>{children}</Ctx.Provider>;
}

export function useRole() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRole must be used inside RoleProvider");
  return c;
}
