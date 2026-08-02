"use client";

import { createContext, useContext } from "react";
import { DEFAULTS, type ContentMap } from "@/lib/content";

export const ContentContext = createContext<ContentMap>(DEFAULTS);

export function useContent() {
  return useContext(ContentContext);
}

export function c(content: ContentMap, key: keyof ContentMap) {
  return content[key] || DEFAULTS[key];
}
