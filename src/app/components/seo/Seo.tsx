import { useEffect } from "react";
import { SITE_NAME } from "@/config/site";
import { absoluteUrl, ogImageUrl, type RouteMeta } from "@/config/routes";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id: string, data: unknown) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-jsonld="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-jsonld", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function Seo({ meta, jsonLd }: { meta: RouteMeta; jsonLd?: object }) {
  useEffect(() => {
    document.title = meta.title;
    upsertMeta("name", "description", meta.description);
    upsertMeta("name", "robots", meta.noindex ? "noindex, nofollow" : "index, follow");
    upsertLink("canonical", absoluteUrl(meta.path));

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", meta.title);
    upsertMeta("property", "og:description", meta.description);
    upsertMeta("property", "og:url", absoluteUrl(meta.path));
    upsertMeta("property", "og:image", ogImageUrl(meta));

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", meta.title);
    upsertMeta("name", "twitter:description", meta.description);
    upsertMeta("name", "twitter:image", ogImageUrl(meta));

    if (jsonLd) upsertJsonLd(meta.path, jsonLd);
  }, [meta, jsonLd]);

  return null;
}
