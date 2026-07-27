import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/config/site";

export interface RouteMeta {
  path: string; // e.g. "/about" — no BASE_PATH prefix, no trailing slash except "/"
  title: string;
  description: string;
  ogImage?: string; // relative to site root; falls back to DEFAULT_OG_IMAGE
  noindex?: boolean; // excluded from sitemap + tagged <meta name="robots" content="noindex">
}

// Every real, public route in the site. This single list drives:
//  - the <Seo> component (title/description/canonical/OG per page)
//  - sitemap.xml generation (scripts/generate-sitemap.mjs)
//  - the prerender script (scripts/prerender.mjs), which renders one static
//    HTML file per entry here
export const ROUTES: RouteMeta[] = [
  {
    path: "/",
    title: `${SITE_NAME} — When Women Rise, Communities Thrive`,
    description:
      "For over 28 years, Mahila Action has worked alongside women, children, and communities to create opportunities, protect rights, and build lasting change from the ground up.",
  },
  {
    path: "/about",
    title: `Who We Are — ${SITE_NAME}`,
    description:
      "Learn about Mahila Action's mission, vision, leadership, and 28-year history of community-led social change in Telangana.",
  },
  {
    path: "/stories",
    title: `Our Stories — ${SITE_NAME}`,
    description:
      "Real stories of women, families, and communities transformed through Mahila Action's leadership, education, and livelihood programmes.",
  },
  {
    path: "/events",
    title: `Events & Community Blog — ${SITE_NAME}`,
    description:
      "Upcoming community events, workshops, and volunteer opportunities from Mahila Action — join the movement near you.",
  },
  {
    path: "/donate",
    title: `Donate — Support Our Work | ${SITE_NAME}`,
    description:
      "Your donation directly funds women's leadership training, education access, and livelihood programmes across Telangana. Give one-time or monthly.",
  },
  {
    path: "/contact",
    title: `Contact Us — ${SITE_NAME}`,
    description: "Get in touch with Mahila Action — email, phone, office address, and hours.",
  },
  {
    path: "/admin",
    title: `Admin — ${SITE_NAME}`,
    description: "Private administration area.",
    noindex: true,
  },
];

// The app always navigates to /home on click and redirects bare "/" there
// on load (see App.tsx), but "/" stays the ONE entry in ROUTES/sitemap and
// the canonical URL for that page — this alias map just lets getRouteMeta
// resolve correctly no matter which of the two the visible address bar shows.
const PATH_ALIASES: Record<string, string> = { "/home": "/" };

export function getRouteMeta(pathname: string): RouteMeta {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const canonical = PATH_ALIASES[normalized] || normalized;
  return ROUTES.find((r) => r.path === canonical) || ROUTES[0];
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

export function ogImageUrl(meta: RouteMeta): string {
  return `${SITE_URL}${meta.ogImage || DEFAULT_OG_IMAGE}`;
}
