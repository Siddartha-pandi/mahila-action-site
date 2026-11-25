const BLOCKED_TAGS_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "svg",
  "math",
  "form",
  "textarea",
  "select",
  "noscript",
  "template",
]);

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "a",
  "figure",
  "figcaption",
  "img",
  "span",
  "div",
  "code",
  "pre",
]);

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&#(\d+);?/g, (_, n) => String.fromCharCode(Number(n) || 0))
    .replace(/&#x([0-9a-f]+);?/gi, (_, n) => String.fromCharCode(parseInt(n, 16) || 0))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "")
    .replace(/&newline;/gi, "");
}

export function isSafeHref(rawUrl: string): boolean {
  const cleaned = decodeBasicEntities(rawUrl)
    .replace(/[\u0000-\u0020\u007f]+/g, "")
    .trim();
  if (!cleaned) return false;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return true;
  if (cleaned.startsWith("#")) return true;
  const lower = cleaned.toLowerCase();
  return lower.startsWith("https://") || lower.startsWith("http://") || lower.startsWith("mailto:") || lower.startsWith("tel:");
}

export function isSafeImageSrc(rawUrl: string): boolean {
  const cleaned = decodeBasicEntities(rawUrl)
    .replace(/[\u0000-\u0020\u007f]+/g, "")
    .trim();
  if (!cleaned) return false;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//")) return true;
  const lower = cleaned.toLowerCase();
  if (lower.startsWith("https://") || lower.startsWith("http://")) return true;
  return /^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[a-z0-9+/=]+$/i.test(cleaned);
}

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitizes editorial HTML rendered via dangerouslySetInnerHTML.
 * Uses DOMParser in browsers and a strict tag/attribute filter fallback during SSR.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
      const root = doc.body.firstElementChild;
      if (!root) return "";

      const sanitizeNode = (node: Node) => {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.COMMENT_NODE) {
            node.removeChild(child);
            continue;
          }
          if (child.nodeType !== Node.ELEMENT_NODE) continue;

          const el = child as Element;
          const tag = el.tagName.toLowerCase();

          if (BLOCKED_TAGS_WITH_CONTENT.has(tag)) {
            node.removeChild(el);
            continue;
          }

          sanitizeNode(el);

          if (!ALLOWED_TAGS.has(tag)) {
            while (el.firstChild) {
              node.insertBefore(el.firstChild, el);
            }
            node.removeChild(el);
            continue;
          }

          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const name = attr.name.toLowerCase();
            if (name.startsWith("on") || name === "style" || name === "srcdoc") {
              el.removeAttribute(attr.name);
              continue;
            }
            if (tag === "a") {
              if (name === "href") {
                if (!isSafeHref(attr.value)) el.removeAttribute(attr.name);
              } else if (name === "target") {
                if (attr.value !== "_blank") el.removeAttribute(attr.name);
              } else if (name !== "rel" && name !== "class" && name !== "title") {
                el.removeAttribute(attr.name);
              }
            } else if (tag === "img") {
              if (name === "src") {
                if (!isSafeImageSrc(attr.value)) el.removeAttribute(attr.name);
              } else if (!["alt", "class", "title", "width", "height", "loading"].includes(name)) {
                el.removeAttribute(attr.name);
              }
            } else if (!["class", "title", "data-placeholder"].includes(name)) {
              el.removeAttribute(attr.name);
            }
          }

          if (tag === "a" && el.getAttribute("target") === "_blank") {
            el.setAttribute("rel", "noopener noreferrer");
          }
        }
      };

      sanitizeNode(root);
      return root.innerHTML;
    } catch {
      // Fallback below
    }
  }

  // Server/SSR fallback: strip comments, blocked elements with body, and unsafe tags/attrs
  let out = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of BLOCKED_TAGS_WITH_CONTENT) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  out = out.replace(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (full.startsWith("</")) return `</${tag}>`;

    const keptAttrs: string[] = [];
    const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(rawAttrs)) !== null) {
      const name = m[1].toLowerCase();
      const val = m[2] ?? m[3] ?? m[4] ?? "";
      if (name.startsWith("on") || name === "style" || name === "srcdoc") continue;
      if (tag === "a") {
        if (name === "href" && isSafeHref(val)) keptAttrs.push(`href="${escapeAttr(val)}"`);
        else if (name === "target" && val === "_blank") keptAttrs.push(`target="_blank" rel="noopener noreferrer"`);
        else if (name === "class" || name === "title") keptAttrs.push(`${name}="${escapeAttr(val)}"`);
      } else if (tag === "img") {
        if (name === "src" && isSafeImageSrc(val)) keptAttrs.push(`src="${escapeAttr(val)}"`);
        else if (["alt", "class", "title", "width", "height", "loading"].includes(name)) {
          keptAttrs.push(`${name}="${escapeAttr(val)}"`);
        }
      } else if (["class", "title", "data-placeholder"].includes(name)) {
        keptAttrs.push(`${name}="${escapeAttr(val)}"`);
      }
    }

    const selfClose = tag === "br" || tag === "hr" || tag === "img";
    return `<${tag}${keptAttrs.length ? " " + keptAttrs.join(" ") : ""}${selfClose ? " /" : ""}>`;
  });

  return out;
}
