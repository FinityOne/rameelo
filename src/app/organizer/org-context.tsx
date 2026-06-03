"use client";

import { createContext, useContext, type ReactNode } from "react";

export type OrgOption = { id: string; name: string; logo_url: string | null };

type OrgContextValue = {
  orgs: OrgOption[];
  activeOrg: OrgOption | null;
  setActiveOrg: (org: OrgOption) => void;
  /** Caller's role in the active org: 'owner' | 'admin' | 'scanner' | 'member'. */
  activeRole: string | null;
  /** Map of orgId → caller's role, for every org the caller belongs to. */
  roles: Record<string, string>;
};

const OrgContext = createContext<OrgContextValue>({
  orgs: [], activeOrg: null, setActiveOrg: () => {}, activeRole: null, roles: {},
});

export function OrgProvider({
  orgs,
  activeOrg,
  setActiveOrg,
  activeRole,
  roles,
  children,
}: {
  orgs: OrgOption[];
  activeOrg: OrgOption | null;
  setActiveOrg: (org: OrgOption) => void;
  activeRole: string | null;
  roles: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <OrgContext.Provider value={{ orgs, activeOrg, setActiveOrg, activeRole, roles }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}

/** True when the caller can manage the org (owner/admin/member) vs. only scan. */
export function canManageOrg(role: string | null): boolean {
  return role === "owner" || role === "admin" || role === "member";
}
