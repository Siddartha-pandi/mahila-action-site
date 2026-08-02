// Thin fetch client for the Admin & Backend API.
// Set VITE_API_URL in your .env (see .env.example) to point at your API instance —
// e.g. http://localhost:4000 in development, or your deployed API URL in production.

const envApiUrl = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL) : undefined;
export const BASE_URL = typeof window !== "undefined"
  ? ""
  : ((envApiUrl as string | undefined)?.replace(/\/$/, "") || "");

async function request<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_jwt") : null;
    const validJwt = token && token !== "session" && token.includes(".") ? token : null;
    const authHeaders: Record<string, string> = validJwt ? { Authorization: `Bearer ${validJwt}` } : {};

    const url = BASE_URL ? `${BASE_URL}${path}` : path;
    const res = await fetch(url, {
      credentials: "include",
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

    if (!res.ok) {
      const message = body?.error?.message || body?.error || res.statusText;
      return { ok: false, error: message, status: res.status };
    }
    return { ok: true, data: body as T, status: res.status };
  } catch (err) {
    return { ok: false, error: "Network error — API server offline or not configured.", status: 0 };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};