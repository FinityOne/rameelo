"use client";

import { createContext, useContext, type ReactNode } from "react";

export type OrgOption = { id: string; name: string; logo_url: string | null };

type OrgContextValue = {
  orgs: OrgOption[];
  activeOrg: OrgOption | null;
  setActiveOrg: (org: OrgOption) => void;
};

const OrgContext = createContext<OrgContextValue>({ orgs: [], activeOrg: null, setActiveOrg: () => {} });

export function OrgProvider({
  orgs,
  activeOrg,
  setActiveOrg,
  children,
}: {
  orgs: OrgOption[];
  activeOrg: OrgOption | null;
  setActiveOrg: (org: OrgOption) => void;
  children: ReactNode;
}) {
  return (
    <OrgContext.Provider value={{ orgs, activeOrg, setActiveOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
