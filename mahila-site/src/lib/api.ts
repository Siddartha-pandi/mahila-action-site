// Thin fetch client for the Strapi backend.
// Set VITE_API_URL in your .env (see .env.example) to point at your Strapi instance —
// e.g. http://localhost:1337 in development, or your deployed Strapi URL in production.

export const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "https://mahila-action-site-production.up.railway.app";

if (!BASE_URL && import.meta.env.PROD) {
  console.warn(
    "VITE_API_URL is not set — API calls will be made relative to the current origin, which is wrong on GitHub Pages. Set VITE_API_URL in your build environment."
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const apiToken = import.meta.env.VITE_STRAPI_API_TOKEN as string | undefined;
    const localToken = typeof window !== "undefined" ? localStorage.getItem("strapi_jwt") : null;
    const token = apiToken || (localToken && localToken !== "admin_authenticated" ? localToken : null);
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(init?.headers || {}),
      },
      ...init,
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // no/invalid JSON body
    }
    // Strapi's error shape is { error: { message, ... } }, not a flat { error: string } —
    // handle both so error logging still shows something readable.
    if (!res.ok) {
      const message = body?.error?.message || body?.error || res.statusText;
      return { ok: false, error: message, status: res.status };
    }
    return { ok: true, data: body as T, status: res.status };
  } catch (err) {
    console.error(`API request failed: ${path}`, err);
    return { ok: false, error: "Network error — is the API server reachable?", status: 0 };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};