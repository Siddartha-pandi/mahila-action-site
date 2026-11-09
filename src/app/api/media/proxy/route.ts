import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Checks whether a given hostname is a local or internal IP to prevent SSRF.
 */
function isInternalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "169.254.169.254"
  ) {
    return true;
  }

  // IPv4 private subnet checks
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (match) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const targetUrl = req.nextUrl.searchParams.get("url")?.trim();
    const format = req.nextUrl.searchParams.get("format")?.toLowerCase();

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only http and https protocols are supported" },
        { status: 400 }
      );
    }

    if (isInternalHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "Access to private or local networks is forbidden" },
        { status: 403 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
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

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream server returned error ${upstreamRes.status}: ${upstreamRes.statusText}` },
        { status: 502 }
      );
    }

    let contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    // Clean up content type
    if (contentType.includes(";")) {
      contentType = contentType.split(";")[0].trim();
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

    // Otherwise return raw binary with permissive CORS headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error proxying image" },
      { status: 500 }
    );
  }
}

