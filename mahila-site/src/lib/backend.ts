import { api } from "./api";

// ── Admin authentication ────────────────

export async function signInAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!email?.trim() || !password) {
    return { ok: false, error: "Enter your admin email and password." };
  }

  // The server is the only authority on credentials. There is deliberately no
  // local fallback here — one used to let any known-looking identifier in with
  // any 4-character password.
  const res = await api.post<{ ok?: boolean; email?: string; jwt?: string; token?: string }>("/api/auth/login", {
    email,
    password,
  });

  if (res.ok && res.data?.ok) {
    // Real authentication lives in the httpOnly cookie the server just set.
    // This value is only a flag telling the UI to render the admin views.
    localStorage.setItem("admin_jwt", res.data.jwt || res.data.token || "session");
    return { ok: true };
  }

  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Invalid login credentials" };
}

export async function signOutAdmin() {
  localStorage.removeItem("admin_jwt");
}

export function onAdminAuthChange(cb: (loggedIn: boolean) => void): () => void {
  const check = () => cb(Boolean(localStorage.getItem("admin_jwt")));
  check();
  window.addEventListener("storage", check);
  return () => window.removeEventListener("storage", check);
}

// ── Local submission storage helpers ────────────────────────────────────

export interface SubmissionItem {
  id: string;
  /** "member" is an account signup — distinct from "volunteer", which is an
   *  application to help at specific events. */
  type: "contact" | "volunteer" | "reservation" | "vendor" | "donation" | "member";
  data: any;
  createdAt: string;
  status: "New" | "Contacted" | "Completed";
}

const SUBMISSION_KEY = "mahila_site_submissions";

// ── Server-backed submissions (the admin panel's source of truth) ───────────
//
// Local storage only ever holds what the current browser submitted, so the
// admin panel used to show a different, partial list on every machine. These
// endpoints read the shared database instead.

const SUBMISSION_SOURCES: { type: SubmissionItem["type"]; path: string }[] = [
  { type: "member", path: "/api/members" },
  { type: "volunteer", path: "/api/volunteers" },
  { type: "reservation", path: "/api/reservations" },
  { type: "vendor", path: "/api/vendors" },
  { type: "donation", path: "/api/donations" },
  { type: "contact", path: "/api/contact" },
];

function parseJsonColumn(value: any, fallback: any) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToSubmission(type: SubmissionItem["type"], row: any): SubmissionItem {
  const { id, status, created_at, createdAt, ...rest } = row;
  return {
    id: String(id),
    type,
    data: {
      ...rest,
      companions: parseJsonColumn(rest.companions, []),
      selected_events: parseJsonColumn(rest.selected_events, []),
      anonymous: rest.anonymous === 1 || rest.anonymous === true,
      needs_space: rest.needs_space === 1 || rest.needs_space === true,
    },
    createdAt: created_at || createdAt || new Date().toISOString(),
    status: (status as SubmissionItem["status"]) || "New",
  };
}

/**
 * Every submission across all six tables, newest first. Throws if the server
 * can't be reached so the caller can fall back to the local mirror rather than
 * silently showing an empty panel.
 */
export async function loadSubmissions(): Promise<SubmissionItem[]> {
  const responses = await Promise.all(SUBMISSION_SOURCES.map((s) => api.get<any[]>(s.path)));

  const failed = responses.find((r) => !r.ok);
  if (failed) {
    throw new Error(failed.error || "Could not load submissions from the server.");
  }

  const items = responses.flatMap((res, i) => {
    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map((row) => rowToSubmission(SUBMISSION_SOURCES[i].type, row));
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Which API path owns a given submission, for status updates and deletes. */
function submissionPath(type: SubmissionItem["type"]) {
  return SUBMISSION_SOURCES.find((s) => s.type === type)?.path;
}

export async function updateSubmissionStatusRemote(
  item: SubmissionItem,
  status: SubmissionItem["status"]
): Promise<{ ok: boolean; error?: string }> {
  const path = submissionPath(item.type);
  if (!path) return { ok: false, error: "Unknown submission type." };
  const res = await api.patch(`${path}/${encodeURIComponent(item.id)}`, { status });
  return { ok: res.ok, error: res.error };
}

export async function deleteSubmissionRemote(item: SubmissionItem): Promise<{ ok: boolean; error?: string }> {
  if (item.type === "member") {
    return { ok: false, error: "Member accounts can't be deleted here — that would remove their sign-in." };
  }
  const path = submissionPath(item.type);
  if (!path) return { ok: false, error: "Unknown submission type." };
  const res = await api.del(`${path}/${encodeURIComponent(item.id)}`);
  return { ok: res.ok, error: res.error };
}

export function getSubmissions(type?: SubmissionItem["type"]): SubmissionItem[] {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    if (!raw) return getInitialMockSubmissions();
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return getInitialMockSubmissions();
    let valid: SubmissionItem[] = items.filter((item: any) => item && typeof item === "object" && item.id && item.type);

    // ── Migration: remove legacy "Permanent Community Volunteer Membership" entries ──
    const LEGACY_TITLE = "Permanent Community Volunteer Membership";
    let changed = false;
    valid = valid.filter(item => {
      if (item.type !== "volunteer") return true;
      const events: string[] = Array.isArray(item.data?.selected_events) ? item.data.selected_events : [];
      // Drop the entire submission if all it has is the legacy title
      if (events.length > 0 && events.every((e: string) => e === LEGACY_TITLE)) {
        changed = true;
        return false;
      }
      // Strip the legacy title from mixed arrays
      if (events.includes(LEGACY_TITLE)) {
        item.data.selected_events = events.filter((e: string) => e !== LEGACY_TITLE);
        changed = true;
      }
      return true;
    });
    if (changed) {
      localStorage.setItem(SUBMISSION_KEY, JSON.stringify(valid));
    }

    return type ? valid.filter(item => item.type === type) : valid;
  } catch {
    return getInitialMockSubmissions();
  }
}

export function getUserSubmissions(email?: string, phone?: string): SubmissionItem[] {
  const all = getSubmissions();
  if (!email && !phone) return [];
  const normEmail = email ? email.trim().toLowerCase() : "";
  const normPhone = phone ? phone.trim().replace(/\s+/g, "") : "";

  return all.filter(item => {
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? item.data.phone.toString().trim().replace(/\s+/g, "") : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (normPhone && itemPhone === normPhone) return true;
    return false;
  });
}

export function saveLocalSubmission(type: SubmissionItem["type"], data: any) {
  try {
    const items = getSubmissions();
    const newItem: SubmissionItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      data,
      createdAt: new Date().toISOString(),
      status: "New",
    };
    items.unshift(newItem);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save local submission:", err);
  }
}

export function updateSubmissionStatus(id: string, status: SubmissionItem["status"]) {
  try {
    const items = getSubmissions();
    const updated = items.map(item => item.id === id ? { ...item, status } : item);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to update submission status:", err);
  }
}

export function deleteSubmission(id: string) {
  try {
    const items = getSubmissions();
    const updated = items.filter(item => item.id !== id);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to delete submission:", err);
  }
}

function getInitialMockSubmissions(): SubmissionItem[] {
  const initial: SubmissionItem[] = [
    {
      id: "contact_101",
      type: "contact",
      data: { name: "Ananya Rao", email: "ananya.rao@example.com", phone: "+91 98765 43210", subject: "Volunteering Inquiry", message: "Hello! I am an educator interested in running weekend workshops for Mahila Action." },
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: "New"
    },
    {
      id: "volunteer_102",
      type: "volunteer",
      data: { name: "Kavita Reddy", email: "kavita.reddy@example.com", phone: "+91 91234 56789", skills: "Teaching, Legal Awareness, Event Operations", selected_events: ["Community Leadership Workshop"] },
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      status: "Contacted"
    },
    {
      id: "reservation_103",
      type: "reservation",
      data: { name: "Suresh Kumar", email: "suresh.k@example.com", phone: "+91 99887 76655", seats: 2, event_name: "Community Leadership Workshop", volunteer_commitment: "event_only" },
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: "New"
    },
    {
      id: "donation_104",
      type: "donation",
      data: { name: "Pooja Verma", email: "pooja.v@example.com", phone: "+91 94433 22110", amount: 5000, anonymous: false, campaign_name: "Livelihood & Micro-finance Fund" },
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: "Completed"
    }
  ];
  try {
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

// ── Public form submissions ──────────────────────────────────────────────

// Each submission is recorded locally (the admin Submissions panel reads from
// there) and posted to the API, which persists it and sends the confirmation
// email. These posts used to be wrapped in `if (BASE_URL)`, and BASE_URL is
// always "" in the browser — Next only exposes NEXT_PUBLIC_* vars, while .env
// sets VITE_API_URL. So nothing ever reached the server and no email was sent.
export async function saveDonation(data: {
  amount: number;
  name: string;
  email: string;
  phone: string;
  anonymous: boolean;
  donation_type?: "one-time" | "monthly";
  event_name?: string;
  campaign_name?: string;
}): Promise<boolean> {
  const payload = { donation_type: "one-time" as const, ...data };
  saveLocalSubmission("donation", payload);
  const res = await api.post("/api/donations", payload);
  return res.ok;
}

export async function saveReservation(data: {
  name: string;
  email: string;
  phone: string;
  seats: number;
  event_name: string;
  volunteer_commitment?: "event_only" | "ongoing";
  companions?: { name: string; phone: string }[];
}): Promise<boolean> {
  saveLocalSubmission("reservation", data);
  const res = await api.post("/api/reservations", data);
  return res.ok;
}

export async function saveVendor(data: {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  offering: string;
  needs_space: boolean;
  event_name: string;
}): Promise<boolean> {
  saveLocalSubmission("vendor", data);
  const res = await api.post("/api/vendors", data);
  return res.ok;
}

export async function saveVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  skills: string;
  volunteer_commitment?: string;
  selected_events: string[];
}): Promise<boolean> {
  saveLocalSubmission("volunteer", data);
  const res = await api.post("/api/volunteers", data);
  return res.ok;
}

export async function saveContact(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<boolean> {
  saveLocalSubmission("contact", data);
  const res = await api.post("/api/contact", data);
  return res.ok;
}

// ── Volunteer accounts (real, persisted — distinct from admin auth) ────────

export type VolunteerAccountProfile = { name: string; email: string; phone: string; skills: string };

// Older builds cached volunteer accounts — including plaintext passwords — in
// local storage so sign-in could work offline. Nothing reads them any more, so
// clear the leftovers from browsers that still have them.
const LEGACY_VOLUNTEER_ACCOUNTS_KEY = "mahila_volunteer_accounts_v1";

function purgeLegacyVolunteerAccounts() {
  try {
    if (localStorage.getItem(LEGACY_VOLUNTEER_ACCOUNTS_KEY)) {
      localStorage.removeItem(LEGACY_VOLUNTEER_ACCOUNTS_KEY);
    }
  } catch {
    // ignore
  }
}

export function getSavedUserSession(): VolunteerAccountProfile | null {
  if (typeof window === "undefined") return null;
  purgeLegacyVolunteerAccounts();
  try {
    const raw = localStorage.getItem("mahila_user_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserSession(session: VolunteerAccountProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem("mahila_user_session", JSON.stringify(session));
    } else {
      localStorage.removeItem("mahila_user_session");
    }
  } catch (err) {
    console.error("Failed to update user session:", err);
  }
  window.dispatchEvent(new Event("mahila_user_session_changed"));
  window.dispatchEvent(new Event("storage"));
}

export async function registerVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  skills?: string;
}): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/register", data);

  if (res.ok && res.data?.profile) {
    // Recorded as "member", not "volunteer" — creating an account is not the
    // same as applying to help at an event, and filing it as the latter made
    // people look like they had registered twice. Note the password is
    // deliberately left out — it must never reach local storage.
    const { password: _password, ...application } = data;
    saveLocalSubmission("member", application);
    return { ok: true, profile: res.data.profile };
  }

  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  // 409 (duplicate email/phone) and 400 (validation) already carry a usable message.
  return { ok: false, error: res.error || "Something went wrong creating your account — please try again." };
}

export async function loginVolunteer(
  identifier: string,
  password: string
): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, error: "Enter your email address and password." };
  }

  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/login", {
    email: normalized,
    password,
  });

  if (res.ok && res.data?.profile) {
    return { ok: true, profile: res.data.profile };
  }

  // A rejected sign-in must stay rejected. Earlier versions fell through to a
  // local-storage match, then to any past form submission, then finally let any
  // identifier in with a 3-character password — so visitors who had never
  // registered were signed in as full members.
  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Incorrect email or password." };
}

export async function requestVolunteerPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const res = await api.post<{ ok: boolean; message: string }>("/api/volunteer-auth/forgot-password", { email });

  // Previously the response was discarded and this always reported success, so a
  // failed request still showed the "Check your email" screen.
  if (res.ok) return { ok: true };

  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Something went wrong — please try again." };
}

export async function resetVolunteerPassword(
  token: string,
  password: string
): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/reset-password", { token, password });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, profile: res.data?.profile };
}