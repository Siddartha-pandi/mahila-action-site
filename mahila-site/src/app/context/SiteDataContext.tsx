"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SITE_DATA, type SiteData } from "@/lib/data";

export const SiteDataContext = createContext<SiteData>(DEFAULT_SITE_DATA);

export function useSiteData() {
  return useContext(SiteDataContext);
}

export type VolAuthStep = "choice" | "login" | "register" | "forgot" | "reset" | "dashboard";

export interface VolunteerProfile {
  name: string;
  email: string;
  phone: string;
  skills: string;
}
