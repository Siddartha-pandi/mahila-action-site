import { ORG, SITE_NAME, SITE_URL } from "@/config/site";
import { absoluteUrl } from "@/config/routes";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: ORG.name,
    url: ORG.url,
    logo: ORG.logo,
    sameAs: ORG.sameAs,
    ...(ORG.contactPoint.telephone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: ORG.contactPoint.telephone,
              contactType: ORG.contactPoint.contactType,
              areaServed: ORG.contactPoint.areaServed,
            },
          ],
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function articleJsonLd(post: {
  title: string;
  excerpt?: string;
  coverImage?: string;
  createdAt: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.createdAt,
    dateModified: post.createdAt,
    mainEntityOfPage: absoluteUrl(post.path),
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: ORG.logo } },
  };
}

export function eventJsonLd(ev: {
  title: string;
  description?: string;
  image?: string;
  eventDate: string;
  location?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: ev.title,
    description: ev.description || undefined,
    image: ev.image ? [ev.image] : undefined,
    startDate: ev.eventDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: ev.location
      ? { "@type": "Place", name: ev.location, address: ev.location }
      : undefined,
    organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

// Shared by the client <Seo> component and the prerender script's head
// builder, so the JSON-LD in prerendered HTML always matches what the
// client would set on navigation — one source of truth, not two.
export function getPageJsonLd(meta: { path: string; title: string }): object[] {
  if (meta.path === "/") return [organizationJsonLd(), websiteJsonLd()];
  return [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: meta.title.split(" — ")[0], path: meta.path }])];
}
