// ═══════════════════════════════════════════════════════════════════════════
// SITE CONFIG — edit these values for your actual GitHub Pages deployment.
// Everything else (sitemap, robots.txt, canonical URLs, Open Graph, JSON-LD)
// is generated FROM these values, so this is the only place you should need
// to touch when the domain/repo changes.
// ═══════════════════════════════════════════════════════════════════════════

// GitHub Pages project site → https://<username>.github.io/<repo-name>/
// IMPORTANT: also update `base` in vite.config.ts to "/<repo-name>/" to match.
export const GITHUB_USERNAME = "mahilaactionvsk-ops";
export const GITHUB_REPO = "mahila-action-site";

export const SITE_URL = `https://${GITHUB_USERNAME}.github.io/${GITHUB_REPO}`;
export const BASE_PATH: string = `/${GITHUB_REPO}/`;

export const SITE_NAME = "Mahila Action";
export const SITE_LOCALE = "en_IN";
export const DEFAULT_OG_IMAGE = "/og-default.jpg"; // relative to BASE_PATH; see public/og-default.jpg

// Organization details used in the sitewide JSON-LD (schema.org Organization).
// Fill in real values before launch — search engines and rich results use these.
export const ORG = {
  name: "Mahila Action",
  url: SITE_URL,
  logo: `${SITE_URL}${BASE_PATH === "/" ? "" : BASE_PATH}logo.png`,
  sameAs: [
    // "https://www.facebook.com/mahilaaction",
    // "https://www.instagram.com/mahilaaction",
    // "https://www.linkedin.com/company/mahilaaction",
  ],
  contactPoint: {
    telephone: "", // e.g. "+91-40-0000-0000"
    contactType: "customer service",
    areaServed: "IN",
  },
};
