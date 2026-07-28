// ── Shared typography helpers ──────────────────────────────────────────────
export function fraunces(extra = "") {
  return `font-['Fraunces',serif] ${extra}`;
}
export function inter(extra = "") {
  return `font-['Inter',sans-serif] ${extra}`;
}

// ── Page type and URL mapping ─────────────────────────────────────────────
export type Page = "home" | "about" | "stories" | "eventsBlog" | "donate" | "contact" | "account" | "admin";

export const PAGE_TO_PATH: Record<Page, string> = {
  home: "/home",
  about: "/about",
  stories: "/stories",
  eventsBlog: "/events",
  donate: "/donate",
  contact: "/contact",
  account: "/account",
  admin: "/admin",
};

export function pathToPage(pathname: string): Page {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") return "home";
  const entry = (Object.entries(PAGE_TO_PATH) as [Page, string][]).find(([, path]) => path === normalized);
  return entry ? entry[0] : "home";
}
