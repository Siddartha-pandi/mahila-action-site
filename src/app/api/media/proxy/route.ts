import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";
import { verifyAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isPrivateIpAddress(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, "").toLowerCase();
  if (!clean) return true;

  // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
  if (clean.startsWith("::ffff:")) {
    return isPrivateIpAddress(clean.slice(7));
  }

  const version = net.isIP(clean);
  if (version === 4) {
    const parts = clean.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 169 && b === 254) return true; // Link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0 && parts[2] === 0) return true;
    if (a === 198 && (b === 18 || b === 19)) return true; // Benchmark range
    if (a >= 224) return true; // Multicast & reserved
    return false;
  }

  if (version === 6) {
    if (clean === "::" || clean === "::1") return true;
    if (clean.startsWith("fc") || clean.startsWith("fd")) return true; // Unique local fc00::/7
    if (/^fe[89ab][0-9a-f]/i.test(clean)) return true; // Link-local fe80::/10
    if (clean.startsWith("ff")) return true; // Multicast
    return false;
  }

  return true;
}

/**
 * Checks whether a hostname or any of its DNS-resolved IPs is internal/private to prevent SSRF.
 */
async function isInternalOrPrivateTarget(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase().trim();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  if (net.isIP(host)) {
    return isPrivateIpAddress(host);
  }

  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (!records || records.length === 0) return true;
    return records.some((rec) => isPrivateIpAddress(rec.address));
  } catch {
    return true;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "media", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const targetUrl = req.nextUrl.searchParams.get("url")?.trim();
    const format = req.nextUrl.searchParams.get("format")?.toLowerCase();

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let currentUrl: URL;
    try {
      currentUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let upstreamRes: Response | null = null;
    try {
      for (let hop = 0; hop < 4; hop++) {
        if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
          return NextResponse.json(
            { error: "Only http and https protocols are supported" },
            { status: 400 }
          );
        }

        if (await isInternalOrPrivateTarget(currentUrl.hostname)) {
          return NextResponse.json(
            { error: "Access to private or local networks is forbidden" },
            { status: 403 }
          );
        }

        upstreamRes = await fetch(currentUrl.toString(), {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8",
          },
        });

        if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
          const location = upstreamRes.headers.get("location");
          if (!location) break;
          try {
            currentUrl = new URL(location, currentUrl);
            continue;
          } catch {
            return NextResponse.json({ error: "Invalid upstream redirect URL" }, { status: 400 });
          }
        }
        break;
      }
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return NextResponse.json({ error: "Upstream image request timed out" }, { status: 504 });
      }
      return NextResponse.json(
        { error: "Failed to connect to image host: " + (fetchErr.message || "Unknown error") },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!upstreamRes) {
      return NextResponse.json({ error: "No response from upstream host" }, { status: 502 });
    }

    if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
      return NextResponse.json({ error: "Too many upstream redirects" }, { status: 502 });
    }

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream server returned error ${upstreamRes.status}: ${upstreamRes.statusText}` },
        { status: 502 }
      );
    }

    let contentType = upstreamRes.headers.get("content-type") || "";
    if (contentType.includes(";")) {
      contentType = contentType.split(";")[0].trim().toLowerCase();
    } else {
      contentType = contentType.trim().toLowerCase();
    }

    if (!contentType.startsWith("image/") || contentType === "image/svg+xml") {
      return NextResponse.json(
        { error: `Unsupported upstream content type: ${contentType || "unknown"}` },
        { status: 415 }
      );
    }

    // Check content length header if present (max 25MB)
    const cl = upstreamRes.headers.get("content-length");
    if (cl && parseInt(cl, 10) > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Image file exceeds 25MB limit" }, { status: 413 });
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Image file exceeds 25MB limit" }, { status: 413 });
    }

    // If format=dataurl was requested, return base64 JSON payload
    if (format === "dataurl" || format === "json") {
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;
      return NextResponse.json({ dataUrl, mimeType: contentType, size: arrayBuffer.byteLength });
    }

    // Otherwise return raw binary without cross-origin wildcard exposure
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error proxying image" },
      { status: 500 }
    );
  }
}

